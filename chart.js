/* ==========================================================================
   HIGH-PERFORMANCE INTERACTIVE CANVAS K-LINE CHART (personal-investment-site/chart.js)
   ========================================================================== */

class FuturesChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id '${canvasId}' not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.chartType = 'candle'; // 'candle' or 'line' (分时/Tick)
        this.indicators = {
            ma5: true,
            ma10: false,
            ma20: false,
            volume: true
        };
        
        // Viewport and layout configurations
        this.paddingRight = 65; // space for Y-axis price labels
        this.paddingBottom = 25; // space for X-axis date labels
        this.paddingTop = 15;
        this.paddingLeft = 15;
        
        this.zoomLevel = 1.0;
        this.hoverIndex = -1;
        this.mouseX = -1;
        this.mouseY = -1;

        // Viewport data windowing (for zooming and panning)
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        // Drag-to-pan state
        this.isPanning = false;
        this.panStartMouseX = 0;
        this.panStartStartIdx = 0;
        
        // Custom scrollbar handle drag state
        this.isDraggingScrollbar = false;
        this.dragStartMouseX = 0;
        this.dragStartHandleLeft = 0;

        // Colors (will check current theme at render time)
        this.theme = 'dark';
        this.lastHoverPct = 0.5;
        
        this.initEvents();
    }

    setData(data) {
        this.data = data.map((d, index, arr) => {
            const rawDate = d.date || d.datetime;
            // Clean date string for display
            let dateStr = '';
            if (rawDate) {
                const dateObj = new Date(rawDate);
                if (isNaN(dateObj.getTime())) {
                    dateStr = String(rawDate);
                } else if (rawDate.includes(' ') || rawDate.includes('T')) {
                    // Time-based label (minute charts)
                    const pad = (num) => String(num).padStart(2, '0');
                    dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
                } else {
                    // Daily label
                    dateStr = rawDate;
                }
            }

            // Calculate moving averages
            const getMA = (period) => {
                if (index < period - 1) return null;
                let sum = 0;
                for (let i = 0; i < period; i++) {
                    sum += parseFloat(arr[index - i].close);
                }
                return sum / period;
            };

            return {
                ...d,
                displayDate: dateStr,
                open: parseFloat(d.open),
                high: parseFloat(d.high),
                low: parseFloat(d.low),
                close: parseFloat(d.close),
                volume: parseFloat(d.volume),
                ma5: getMA(5),
                ma10: getMA(10),
                ma20: getMA(20)
            };
        });
        
        this.hoverIndex = -1;
        // Default to showing 100% of data (extreme timeframe capability)
        this.visibleStart = 0;
        this.visibleEnd = this.data.length;
        
        this.resize();
    }

    setChartType(type) {
        this.chartType = type;
        this.render();
    }

    toggleIndicator(indicator) {
        if (this.indicators.hasOwnProperty(indicator)) {
            this.indicators[indicator] = !this.indicators[indicator];
            this.render();
        }
    }

    initEvents() {
        // Handle resizing
        window.addEventListener('resize', () => this.resize());

        // Mouse interactions for crosshair & panning
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Accounts for CSS scaling in logical coordinates
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.updateHoverIndex();
            
            const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
            if (chartWidth > 0 && this.mouseX >= this.paddingLeft && this.mouseX <= this.logicalWidth - this.paddingRight) {
                this.lastHoverPct = (this.mouseX - this.paddingLeft) / chartWidth;
            }
            
            // Panning logic
            if (this.isPanning && this.data.length) {
                const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
                const visibleCount = this.visibleEnd - this.visibleStart;
                
                const clientCandleWidth = chartWidth / visibleCount;
                const dx = e.clientX - this.panStartMouseX;
                const shift = Math.round(dx / clientCandleWidth);
                
                let newStart = this.panStartStartIdx - shift;
                if (newStart < 0) newStart = 0;
                let newEnd = newStart + visibleCount;
                if (newEnd > this.data.length) {
                    newEnd = this.data.length;
                    newStart = newEnd - visibleCount;
                    if (newStart < 0) newStart = 0;
                }
                
                this.visibleStart = newStart;
                this.visibleEnd = newEnd;
                this.updateHoverIndex();
            }
            
            this.render();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = -1;
            this.mouseY = -1;
            this.hoverIndex = -1;
            this.isPanning = false;
            this.render();
            this.triggerHoverCallback(null);
        });

        // Start panning
        this.canvas.addEventListener('mousedown', (e) => {
            this.isPanning = true;
            this.panStartMouseX = e.clientX;
            this.panStartStartIdx = this.visibleStart;
        });

        // Release mouse drag globally
        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.isDraggingScrollbar = false;
        });

        window.addEventListener('touchend', () => {
            this.isPanning = false;
            this.isDraggingScrollbar = false;
        });

        // Centered Wheel Zooming
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.data.length) return;
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const clientMouseX = e.clientX - rect.left;
            
            const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
            
            // Percentage of mouse X across chart area
            let pct = (clientMouseX - this.paddingLeft) / chartWidth;
            if (pct < 0) pct = 0;
            if (pct > 1) pct = 1;
            
            const visibleCount = this.visibleEnd - this.visibleStart;
            const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15; // scroll up to zoom in, scroll down to zoom out
            
            let newCount = Math.round(visibleCount * zoomFactor);
            if (newCount < 10) newCount = 10;
            if (newCount > this.data.length) newCount = this.data.length;
            
            const diff = visibleCount - newCount;
            let newStart = this.visibleStart + Math.round(diff * pct);
            let newEnd = newStart + newCount;
            
            if (newStart < 0) {
                newStart = 0;
                newEnd = newStart + newCount;
            }
            if (newEnd > this.data.length) {
                newEnd = this.data.length;
                newStart = newEnd - newCount;
                if (newStart < 0) newStart = 0;
            }
            
            this.visibleStart = newStart;
            this.visibleEnd = newEnd;
            this.updateHoverIndex();
            this.render();
        }, { passive: false });

        // Touch event handlers for gesture pan/zoom
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Single finger touch -> swipe to pan
                this.isTouchPanning = true;
                this.isTouchZooming = false;
                this.lastTouchX = e.touches[0].clientX;
                this.panStartStartIdx = this.visibleStart;
            } else if (e.touches.length === 2) {
                // Two fingers pinch -> zoom
                this.isTouchZooming = true;
                this.isTouchPanning = false;
                
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                this.touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                
                // Find midpoint relative to chart
                const rect = this.canvas.getBoundingClientRect();
                const midClientX = (t1.clientX + t2.clientX) / 2;
                const midX = midClientX - rect.left;
                
                const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
                let pct = (midX - this.paddingLeft) / chartWidth;
                if (pct < 0) pct = 0;
                if (pct > 1) pct = 1;
                this.touchStartMidPct = pct;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.data.length) return;
            
            if (this.isTouchPanning && e.touches.length === 1) {
                const touchX = e.touches[0].clientX;
                const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
                const visibleCount = this.visibleEnd - this.visibleStart;
                const clientCandleWidth = chartWidth / visibleCount;
                
                const dx = touchX - this.lastTouchX;
                const shift = Math.round(dx / clientCandleWidth);
                
                let newStart = this.panStartStartIdx - shift;
                if (newStart < 0) newStart = 0;
                let newEnd = newStart + visibleCount;
                if (newEnd > this.data.length) {
                    newEnd = this.data.length;
                    newStart = newEnd - visibleCount;
                    if (newStart < 0) newStart = 0;
                }
                
                this.visibleStart = newStart;
                this.visibleEnd = newEnd;
                this.render();
            } else if (this.isTouchZooming && e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                
                if (this.touchStartDist > 0 && newDist > 0) {
                    const factor = this.touchStartDist / newDist;
                    
                    const visibleCount = this.visibleEnd - this.visibleStart;
                    let newCount = Math.round(visibleCount * factor);
                    
                    if (newCount < 10) newCount = 10;
                    if (newCount > this.data.length) newCount = this.data.length;
                    
                    const diff = visibleCount - newCount;
                    let newStart = this.visibleStart + Math.round(diff * this.touchStartMidPct);
                    let newEnd = newStart + newCount;
                    
                    if (newStart < 0) {
                        newStart = 0;
                        newEnd = newStart + newCount;
                    }
                    if (newEnd > this.data.length) {
                        newEnd = this.data.length;
                        newStart = newEnd - newCount;
                        if (newStart < 0) newStart = 0;
                    }
                    
                    this.visibleStart = newStart;
                    this.visibleEnd = newEnd;
                    this.touchStartDist = newDist;
                    this.render();
                }
            }
        }, { passive: true });

        const endTouch = () => {
            this.isTouchPanning = false;
            this.isTouchZooming = false;
        };
        this.canvas.addEventListener('touchend', endTouch);
        this.canvas.addEventListener('touchcancel', endTouch);

        // Double click to reset zoom
        this.canvas.addEventListener('dblclick', () => {
            this.visibleStart = 0;
            this.visibleEnd = this.data.length;
            this.render();
        });

        // Resize when entering/exiting fullscreen mode
        document.addEventListener('fullscreenchange', () => {
            this.resize();
        });

        // Bind control elements (zoom buttons & scrollbar slider)
        this.initControls();
    }

    initControls() {
        const fullscreenBtn = document.getElementById('chartFullscreen');
        const track = document.getElementById('scrollbarTrack');
        const handle = document.getElementById('scrollbarHandle');

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const chartPanel = this.canvas.closest('.chart-panel');
                if (!chartPanel) return;
                
                if (!document.fullscreenElement) {
                    chartPanel.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            });
        }

        if (track && handle) {
            // Center viewport on click in scrollbar track
            track.addEventListener('click', (e) => {
                if (e.target === handle) return;
                const rect = track.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = clickX / rect.width;

                const visibleCount = this.visibleEnd - this.visibleStart;
                let newStart = Math.round(pct * this.data.length - visibleCount / 2);

                if (newStart < 0) newStart = 0;
                let newEnd = newStart + visibleCount;
                if (newEnd > this.data.length) {
                    newEnd = this.data.length;
                    newStart = newEnd - visibleCount;
                    if (newStart < 0) newStart = 0;
                }

                this.visibleStart = newStart;
                this.visibleEnd = newEnd;
                this.render();
            });

            // Start dragging handle
            handle.addEventListener('mousedown', (e) => {
                this.isDraggingScrollbar = true;
                this.dragStartMouseX = e.clientX;
                this.dragStartHandleLeft = handle.offsetLeft;
                e.stopPropagation();
            });

            handle.addEventListener('touchstart', (e) => {
                this.isDraggingScrollbar = true;
                this.dragStartMouseX = e.touches[0].clientX;
                this.dragStartHandleLeft = handle.offsetLeft;
                e.stopPropagation();
            }, { passive: true });

            // Handle dragging globally
            window.addEventListener('mousemove', (e) => {
                if (!this.isDraggingScrollbar || !this.data.length) return;

                const trackWidth = track.getBoundingClientRect().width;
                const handleWidth = handle.getBoundingClientRect().width;
                const maxLeft = trackWidth - handleWidth;
                if (maxLeft <= 0) return;

                const dx = e.clientX - this.dragStartMouseX;
                let newLeft = this.dragStartHandleLeft + dx;
                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxLeft) newLeft = maxLeft;

                const visibleCount = this.visibleEnd - this.visibleStart;
                const scrollableBars = this.data.length - visibleCount;

                if (scrollableBars > 0) {
                    this.visibleStart = Math.round((newLeft / maxLeft) * scrollableBars);
                    this.visibleEnd = this.visibleStart + visibleCount;
                    this.render();
                }
            });

            window.addEventListener('touchmove', (e) => {
                if (!this.isDraggingScrollbar || !this.data.length) return;

                const trackWidth = track.getBoundingClientRect().width;
                const handleWidth = handle.getBoundingClientRect().width;
                const maxLeft = trackWidth - handleWidth;
                if (maxLeft <= 0) return;

                const dx = e.touches[0].clientX - this.dragStartMouseX;
                let newLeft = this.dragStartHandleLeft + dx;
                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxLeft) newLeft = maxLeft;

                const visibleCount = this.visibleEnd - this.visibleStart;
                const scrollableBars = this.data.length - visibleCount;

                if (scrollableBars > 0) {
                    this.visibleStart = Math.round((newLeft / maxLeft) * scrollableBars);
                    this.visibleEnd = this.visibleStart + visibleCount;
                    this.render();
                }
            }, { passive: true });
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        // Support Retina displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Save raw layout dimensions in logical pixels
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;
        
        this.render();
    }

    updateHoverIndex() {
        if (!this.data.length || this.mouseX < this.paddingLeft || this.mouseX > this.logicalWidth - this.paddingRight) {
            this.hoverIndex = -1;
            return;
        }

        const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
        const visibleCount = this.visibleEnd - this.visibleStart;
        const candleWidth = chartWidth / visibleCount;
        
        const relativeX = this.mouseX - this.paddingLeft;
        const offsetIndex = Math.floor(relativeX / candleWidth);
        const index = this.visibleStart + offsetIndex;
        
        if (index >= this.visibleStart && index < this.visibleEnd && index < this.data.length) {
            this.hoverIndex = index;
            this.triggerHoverCallback(this.data[index]);
        } else {
            this.hoverIndex = -1;
        }
    }

    onHover(callback) {
        this.hoverCallback = callback;
    }

    triggerHoverCallback(dataPoint) {
        if (this.hoverCallback) {
            this.hoverCallback(dataPoint);
        }
    }

    render() {
        if (!this.canvas || !this.ctx || !this.data.length) return;

        // Detect current theme by looking at body data attribute
        this.theme = document.body.getAttribute('data-theme') || 'dark';

        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Define theme-based coloring
        const isDark = this.theme === 'dark';
        const colorUp = isDark ? '#ef4444' : '#dc2626';     // Chinese red for rise
        const colorDown = isDark ? '#10b981' : '#059669';   // Chinese green for fall
        const colorGrid = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';
        const colorBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        const colorText = isDark ? '#9ca3af' : '#475569';
        const colorTextBright = isDark ? '#f3f4f6' : '#0f172a';
        
        // Define subplots height ratios
        const hasVolume = this.indicators.volume;
        const priceChartHeightRatio = hasVolume ? 0.72 : 0.95;
        
        const chartWidth = w - this.paddingLeft - this.paddingRight;
        const totalChartHeight = h - this.paddingTop - this.paddingBottom;
        
        const priceHeight = totalChartHeight * priceChartHeightRatio;
        const volumeHeight = totalChartHeight * (1 - priceChartHeightRatio - 0.05);
        const volumeTop = this.paddingTop + priceHeight + (totalChartHeight * 0.05);

        // Find min/max values dynamically in the VISIBLE data slice to scale K-lines
        let maxPrice = -Infinity;
        let minPrice = Infinity;
        let maxVol = 0;

        const visibleData = this.data.slice(this.visibleStart, this.visibleEnd);
        visibleData.forEach(d => {
            if (d.high > maxPrice) maxPrice = d.high;
            if (d.low < minPrice) minPrice = d.low;
            if (d.volume > maxVol) maxVol = d.volume;
        });

        // Add 5% padding to top and bottom of price chart
        const priceRange = maxPrice - minPrice;
        maxPrice += priceRange * 0.05;
        minPrice -= priceRange * 0.05;
        if (minPrice < 0) minPrice = 0;

        // Draw grids & borders
        ctx.strokeStyle = colorGrid;
        ctx.lineWidth = 1;
        
        // Horizontal grid lines in price chart (4 grid lines)
        for (let i = 0; i <= 4; i++) {
            const y = this.paddingTop + (priceHeight * (i / 4));
            ctx.beginPath();
            ctx.moveTo(this.paddingLeft, y);
            ctx.lineTo(w - this.paddingRight, y);
            ctx.stroke();

            // Y-axis labels (Price)
            const priceVal = maxPrice - ((maxPrice - minPrice) * (i / 4));
            ctx.fillStyle = colorText;
            ctx.font = '10px Inter';
            ctx.textBaseline = 'middle';
            ctx.fillText(priceVal.toFixed(1), w - this.paddingRight + 6, y);
        }

        // Draw horizontal grid lines in volume chart
        if (hasVolume) {
            ctx.beginPath();
            ctx.moveTo(this.paddingLeft, volumeTop);
            ctx.lineTo(w - this.paddingRight, volumeTop);
            ctx.moveTo(this.paddingLeft, volumeTop + volumeHeight);
            ctx.lineTo(w - this.paddingRight, volumeTop + volumeHeight);
            ctx.stroke();
            
            // Volume Y-axis label (Max Vol)
            ctx.fillStyle = colorText;
            ctx.font = '9px Inter';
            ctx.textBaseline = 'top';
            ctx.fillText(this.formatVolume(maxVol), w - this.paddingRight + 6, volumeTop);
        }

        // Render Data Points (Candlesticks / Line Chart)
        const count = visibleData.length;
        const candleWidth = chartWidth / count;
        const gap = Math.max(1, candleWidth * 0.15); // Gap between candles
        
        // Helper to convert price to canvas Y coordinate
        const getPriceY = (price) => {
            return this.paddingTop + priceHeight * (1 - (price - minPrice) / (maxPrice - minPrice));
        };

        // Helper to convert volume to canvas Y coordinate
        const getVolY = (vol) => {
            if (maxVol === 0) return volumeTop + volumeHeight;
            return volumeTop + volumeHeight * (1 - vol / maxVol);
        };

        // 1. Draw Candlesticks or Close Price line
        if (this.chartType === 'candle') {
            visibleData.forEach((d, i) => {
                const x = this.paddingLeft + (i * candleWidth);
                const centerX = x + (candleWidth / 2);
                
                const yOpen = getPriceY(d.open);
                const yClose = getPriceY(d.close);
                const yHigh = getPriceY(d.high);
                const yLow = getPriceY(d.low);
                
                const isUp = d.close >= d.open;
                ctx.strokeStyle = isUp ? colorUp : colorDown;
                ctx.fillStyle = isUp ? colorUp : colorDown;
                ctx.lineWidth = Math.max(1.5, candleWidth * 0.08);

                // Draw shadow lines (High-Low)
                ctx.beginPath();
                ctx.moveTo(centerX, yHigh);
                ctx.lineTo(centerX, yLow);
                ctx.stroke();

                // Draw candle body
                const bodyHeight = Math.abs(yClose - yOpen);
                const bodyY = Math.min(yOpen, yClose);
                const rectWidth = candleWidth - gap;
                
                ctx.fillRect(x + (gap / 2), bodyY, rectWidth, Math.max(1, bodyHeight));

                // 2. Draw Volume Bars
                if (hasVolume) {
                    const yVol = getVolY(d.volume);
                    const volBarHeight = volumeTop + volumeHeight - yVol;
                    ctx.fillStyle = isUp ? colorUp : colorDown;
                    ctx.fillRect(x + (gap / 2), yVol, rectWidth, Math.max(1, volBarHeight));
                }
            });
        } else {
            // Tick / Line Chart (Connecting Close prices)
            ctx.beginPath();
            visibleData.forEach((d, i) => {
                const x = this.paddingLeft + (i * candleWidth) + (candleWidth / 2);
                const y = getPriceY(d.close);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = varColor('--primary');
            ctx.lineWidth = 2;
            ctx.stroke();

            // Gradient area fill under price line
            ctx.lineTo(this.paddingLeft + (count - 1) * candleWidth + (candleWidth / 2), this.paddingTop + priceHeight);
            ctx.lineTo(this.paddingLeft + (candleWidth / 2), this.paddingTop + priceHeight);
            ctx.closePath();
            const areaGradient = ctx.createLinearGradient(0, this.paddingTop, 0, this.paddingTop + priceHeight);
            areaGradient.addColorStop(0, hexToRgba(varColor('--primary'), 0.2));
            areaGradient.addColorStop(1, hexToRgba(varColor('--primary'), 0.0));
            ctx.fillStyle = areaGradient;
            ctx.fill();

            // Volume Bars for line chart
            if (hasVolume) {
                visibleData.forEach((d, i) => {
                    const x = this.paddingLeft + (i * candleWidth);
                    const rectWidth = candleWidth - gap;
                    const isUp = i === 0 ? true : d.close >= visibleData[i - 1].close;
                    const yVol = getVolY(d.volume);
                    const volBarHeight = volumeTop + volumeHeight - yVol;
                    ctx.fillStyle = isUp ? colorUp : colorDown;
                    ctx.fillRect(x + (gap / 2), yVol, rectWidth, Math.max(1, volBarHeight));
                });
            }
        }

        // Helper functions for theme variable fetching
        function varColor(variableName) {
            return getComputedStyle(document.body).getPropertyValue(variableName).trim();
        }

        function hexToRgba(hex, alpha) {
            hex = hex.replace('#', '');
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // 3. Draw Moving Averages (Price overlay)
        if (this.chartType === 'candle') {
            const drawMA = (key, color) => {
                ctx.beginPath();
                let started = false;
                visibleData.forEach((d, i) => {
                    const val = d[key];
                    if (val !== null) {
                        const x = this.paddingLeft + (i * candleWidth) + (candleWidth / 2);
                        const y = getPriceY(val);
                        if (!started) {
                            ctx.moveTo(x, y);
                            started = true;
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                });
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2;
                ctx.stroke();
            };

            if (this.indicators.ma5) drawMA('ma5', '#f59e0b'); // Amber
            if (this.indicators.ma10) drawMA('ma10', '#ec4899'); // Pink
            if (this.indicators.ma20) drawMA('ma20', '#3b82f6'); // Blue
        }

        // 4. X-Axis Date Labels (draw about 5 labels depending on count)
        const labelInterval = Math.ceil(count / 5);
        ctx.fillStyle = colorText;
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        visibleData.forEach((d, i) => {
            if (i % labelInterval === 0 || i === count - 1) {
                const x = this.paddingLeft + (i * candleWidth) + (candleWidth / 2);
                ctx.beginPath();
                ctx.strokeStyle = colorGrid;
                ctx.moveTo(x, this.paddingTop);
                ctx.lineTo(x, this.paddingTop + priceHeight);
                ctx.stroke();
                
                // Print date text
                ctx.fillStyle = colorText;
                ctx.fillText(d.displayDate, x, this.paddingTop + priceHeight + 6);
            }
        });

        // 5. Crosshair and Tooltip drawing on hover
        if (this.hoverIndex >= this.visibleStart && this.hoverIndex < this.visibleEnd) {
            const d = this.data[this.hoverIndex];
            const localIndex = this.hoverIndex - this.visibleStart;
            const x = this.paddingLeft + (localIndex * candleWidth) + (candleWidth / 2);
            
            // Vertical cursor tracking line
            ctx.beginPath();
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // dashed line
            ctx.moveTo(x, this.paddingTop);
            ctx.lineTo(x, h - this.paddingBottom);
            ctx.stroke();
            
            // Horizontal cursor tracking line (tied to mouse coordinate Y inside price graph)
            if (this.mouseY >= this.paddingTop && this.mouseY <= this.paddingTop + priceHeight) {
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, this.mouseY);
                ctx.lineTo(w - this.paddingRight, this.mouseY);
                ctx.stroke();
                
                // Draw coordinate label on Y axis
                const hoverPrice = maxPrice - ((maxPrice - minPrice) * ((this.mouseY - this.paddingTop) / priceHeight));
                ctx.setLineDash([]); // solid background for label
                ctx.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
                ctx.fillRect(w - this.paddingRight + 1, this.mouseY - 8, this.paddingRight - 2, 16);
                ctx.fillStyle = colorTextBright;
                ctx.font = '10px Inter';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(hoverPrice.toFixed(1), w - this.paddingRight + 6, this.mouseY);
            }
            
            ctx.setLineDash([]); // Reset line dash

            // Draw K-line details banner inside the top-left area of the canvas
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.85)';
            ctx.fillRect(this.paddingLeft + 5, this.paddingTop + 5, 450, 20);
            
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            let textX = this.paddingLeft + 10;
            const drawLabelVal = (lbl, val, color) => {
                ctx.fillStyle = colorText;
                ctx.fillText(lbl, textX, this.paddingTop + 15);
                textX += ctx.measureText(lbl).width + 3;
                
                ctx.fillStyle = color;
                ctx.fillText(val, textX, this.paddingTop + 15);
                textX += ctx.measureText(val).width + 12;
            };

            const priceColor = d.close >= d.open ? colorUp : colorDown;
            
            drawLabelVal('开:', d.open.toFixed(1), priceColor);
            drawLabelVal('高:', d.high.toFixed(1), colorUp);
            drawLabelVal('低:', d.low.toFixed(1), colorDown);
            drawLabelVal('收:', d.close.toFixed(1), priceColor);
            
            const pct = d.open !== 0 ? ((d.close - d.open) / d.open * 100) : 0;
            const pctText = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
            drawLabelVal('幅:', pctText, priceColor);
            drawLabelVal('量:', this.formatVolume(d.volume), colorTextBright);
        }

        // Update custom scrollbar handle position
        const handle = document.getElementById('scrollbarHandle');
        const track = document.getElementById('scrollbarTrack');
        if (handle && track && this.data.length) {
            const trackWidth = track.getBoundingClientRect().width;
            if (trackWidth > 0) {
                const visibleCount = this.visibleEnd - this.visibleStart;
                const widthPct = visibleCount / this.data.length;
                const handleWidth = Math.max(20, trackWidth * widthPct);
                handle.style.width = `${handleWidth}px`;
                
                const maxLeft = trackWidth - handleWidth;
                if (maxLeft > 0 && this.data.length > visibleCount) {
                    const leftPct = this.visibleStart / (this.data.length - visibleCount);
                    handle.style.left = `${leftPct * maxLeft}px`;
                } else {
                    handle.style.left = '0px';
                }
            }
        }
    }

    formatVolume(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return String(num);
    }
}
