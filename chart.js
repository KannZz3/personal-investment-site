/* ==========================================================================
   HIGH-PERFORMANCE INTERACTIVE CANVAS K-LINE CHART (personal-investment-site/chart.js)
   ========================================================================== */

export class FuturesChart {
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
            ma10: true,
            ma20: true,
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

        // Colors (will check current theme at render time)
        this.theme = 'dark';
        
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

        // Mouse interactions for crosshair
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Accounts for CSS scaling
            this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            this.updateHoverIndex();
            this.render();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = -1;
            this.mouseY = -1;
            this.hoverIndex = -1;
            this.render();
            this.triggerHoverCallback(null);
        });
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
        const count = this.data.length;
        const candleWidth = chartWidth / count;
        
        const relativeX = this.mouseX - this.paddingLeft;
        const index = Math.floor(relativeX / candleWidth);
        
        if (index >= 0 && index < count) {
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

        // Find min/max values in data to scale K-lines
        let maxPrice = -Infinity;
        let minPrice = Infinity;
        let maxVol = 0;

        this.data.forEach(d => {
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
        const count = this.data.length;
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
            this.data.forEach((d, i) => {
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
                
                if (isUp) {
                    // Hollow body or solid body based on design. Standard Chinese K-line is solid or hollow.
                    // Let's use a beautiful semi-transparent solid fill for up candles, and solid for down.
                    ctx.fillRect(x + (gap / 2), bodyY, rectWidth, Math.max(1, bodyHeight));
                } else {
                    ctx.fillRect(x + (gap / 2), bodyY, rectWidth, Math.max(1, bodyHeight));
                }

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
            this.data.forEach((d, i) => {
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
                this.data.forEach((d, i) => {
                    const x = this.paddingLeft + (i * candleWidth);
                    const rectWidth = candleWidth - gap;
                    const isUp = i === 0 ? true : d.close >= this.data[i - 1].close;
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
                this.data.forEach((d, i) => {
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
        this.data.forEach((d, i) => {
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
        if (this.hoverIndex >= 0 && this.hoverIndex < count) {
            const d = this.data[this.hoverIndex];
            const x = this.paddingLeft + (this.hoverIndex * candleWidth) + (candleWidth / 2);
            
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
