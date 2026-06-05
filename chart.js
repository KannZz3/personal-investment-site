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
        
        // Market Profile states
        this.symbol = '';
        this.tpoLevel = 'none';
        this.vpLevel = 'none';
        this.bars1m = [];
        this.bars5m = [];
        this.bars15m = [];
        this.bars30m = [];
        this.bars60m = [];
        this.dailyDates = [];
        this.profileCache = {};
        
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

    setProfileLevels(tpoLevel, vpLevel) {
        this.tpoLevel = tpoLevel || 'none';
        this.vpLevel = vpLevel || 'none';
    }

    setIntradayData({ bars1m, bars5m, bars15m, bars30m, bars60m, dailyDates }) {
        this.bars1m = bars1m || [];
        this.bars5m = bars5m || [];
        this.bars15m = bars15m || [];
        this.bars30m = bars30m || [];
        this.bars60m = bars60m || [];
        this.dailyDates = dailyDates || [];
    }

    getProfileData(type, level, endDate) {
        if (level === 'none') return null;
        
        const symbol = this.symbol;
        const cacheKey = `${symbol}_${endDate}_${level}_${type}`;
        if (this.profileCache[cacheKey]) {
            return this.profileCache[cacheKey];
        }
        
        const tickSize = getTickSize(symbol);
        const dailyDates = this.dailyDates;
        
        const barsDict = {
            '1m': this.bars1m,
            '5m': this.bars5m,
            '15m': this.bars15m,
            '30m': this.bars30m,
            '60m': this.bars60m
        };
        
        // Setup checks parameters
        let preferredFrequency = '';
        let fallbackFrequencies = [];
        if (type === 'tpo') {
            preferredFrequency = '30m';
            fallbackFrequencies = []; // Strictly no fallback for TPO
        } else {
            preferredFrequency = '1m';
            if (level === '30m') {
                fallbackFrequencies = ['5m']; // Strictly no 15m for 30m VP
            } else {
                fallbackFrequencies = ['5m', '15m']; // Daily/Weekly composite VP can fallback to 15m
            }
        }
        
        const availability = checkProfileDataAvailability({
            symbol,
            profileType: type,
            profileLevel: level,
            requestedEndDate: endDate,
            dailyDates,
            barsDict,
            preferredFrequency,
            fallbackFrequencies
        });
        
        if (!availability.canBuild) {
            const emptyProfile = {
                type: type,
                level: level,
                symbol: symbol,
                endDate: endDate,
                lookback: level === '30m' ? '1D' : level === 'daily' ? '20D' : '8W',
                poc: 0, vah: 0, val: 0, rangeHigh: 0, rangeLow: 0,
                rows: [],
                meta: {
                    requestedFrequency,
                    actualFrequencyUsed: preferredFrequency,
                    earliestAvailableTime: availability.earliestAvailableTime || "",
                    latestAvailableTime: availability.latestAvailableTime || "",
                    profileStartTime: "",
                    profileEndTime: "",
                    fallbackUsed: false,
                    insufficientReason: availability.insufficientReason || "Data insufficient",
                    dataQuality: "insufficient"
                }
            };
            this.profileCache[cacheKey] = emptyProfile;
            return emptyProfile;
        }
        
        const activeBars = barsDict[availability.actualFrequencyUsed];
        let profile = null;
        
        if (type === 'tpo') {
            if (level === '30m') {
                profile = buildTpoProfile({ bars30m: activeBars, tickSize, symbol, sessionDate: endDate, dailyDates });
            } else if (level === 'daily') {
                profile = buildDailyCompositeTpo({ bars30m: activeBars, tickSize, symbol, endDate, dailyDates, lookbackDays: 20 });
            } else if (level === 'weekly') {
                profile = buildWeeklyCompositeTpo({ bars30m: activeBars, tickSize, symbol, endDate, dailyDates, lookbackWeeks: 8 });
            }
        } else if (type === 'volume') {
            if (level === '30m') {
                profile = buildVolumeProfile({ bars1m: activeBars, tickSize, symbol, sessionDate: endDate, dailyDates });
            } else if (level === 'daily') {
                profile = buildDailyCompositeVolume({ bars1m: activeBars, tickSize, symbol, endDate, dailyDates, lookbackDays: 20 });
            } else if (level === 'weekly') {
                profile = buildWeeklyCompositeVolume({ bars1m: activeBars, tickSize, symbol, endDate, dailyDates, lookbackWeeks: 8 });
            }
        }
        
        if (profile) {
            // Enrich metadata
            if (!profile.meta) profile.meta = {};
            profile.meta.requestedFrequency = preferredFrequency;
            profile.meta.actualFrequencyUsed = availability.actualFrequencyUsed;
            profile.meta.earliestAvailableTime = availability.earliestAvailableTime;
            profile.meta.latestAvailableTime = availability.latestAvailableTime;
            profile.meta.profileStartTime = availability.adjustedStartTime;
            profile.meta.profileEndTime = availability.adjustedEndTime;
            profile.meta.fallbackUsed = availability.fallbackUsed;
            if (availability.fallbackReason) {
                profile.meta.fallbackReason = availability.fallbackReason;
            }
            profile.meta.dataQuality = availability.fallbackUsed ? "fallback" : "full";
            
            // Count unique trading days covered in the lookback window
            if (dailyDates) {
                let lookbackDays = 1;
                if (level === 'daily') lookbackDays = 20;
                else if (level === 'weekly') lookbackDays = 40;
                
                const endIdx = dailyDates.indexOf(endDate);
                if (endIdx !== -1) {
                    const startIdx = Math.max(0, endIdx - lookbackDays + 1);
                    profile.meta.dataCoverageDays = endIdx - startIdx + 1;
                }
            }
            
            this.profileCache[cacheKey] = profile;
        }
        return profile;
    }

    drawProfileTooltip(type, row, profile, mouseX, mouseY, w, h) {
        const ctx = this.ctx;
        const isDark = this.theme === 'dark';
        const meta = profile.meta || {};
        
        // Calculate dynamic height based on metadata lines
        let linesCount = type === 'tpo' ? 4 : 5; // Base lines
        if (meta.actualFrequencyUsed) linesCount++;
        if (meta.dataCoverageDays) linesCount++;
        if (meta.profileStartTime && meta.profileEndTime) linesCount++;
        if (type === 'volume' && meta.fallbackUsed && meta.fallbackReason) linesCount++;
        
        const tooltipW = 210;
        const tooltipH = 38 + linesCount * 16;
        
        let tooltipX = mouseX + 15;
        let tooltipY = mouseY + 15;
        
        if (tooltipX + tooltipW > w) tooltipX = mouseX - tooltipW - 15;
        if (tooltipY + tooltipH > h) tooltipY = mouseY - tooltipH - 15;
        if (tooltipX < 0) tooltipX = 10;
        if (tooltipY < 0) tooltipY = 10;
        
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        
        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 8);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.rect(tooltipX, tooltipY, tooltipW, tooltipH);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.fillStyle = isDark ? '#f3f4f6' : '#0f172a';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let textY = tooltipY + 10;
        const lineH = 16;
        
        const drawLine = (label, val, color) => {
            ctx.fillStyle = isDark ? '#9ca3af' : '#475569';
            ctx.font = '10px Inter';
            ctx.fillText(label, tooltipX + 10, textY);
            
            ctx.fillStyle = color || (isDark ? '#f3f4f6' : '#0f172a');
            ctx.font = 'bold 10px Inter';
            const labelW = ctx.measureText(label).width;
            ctx.fillText(val, tooltipX + 10 + labelW + 5, textY);
            
            textY += lineH;
        };
        
        if (type === 'tpo') {
            ctx.fillText("TPO Profile Details", tooltipX + 10, textY);
            textY += 18;
            
            drawLine("价格:", row.price.toFixed(1));
            drawLine("TPO 计数:", String(row.value));
            
            let areaText = "Outside VA";
            let areaColor = isDark ? '#9ca3af' : '#475569';
            if (row.isPoc) {
                areaText = "POC";
                areaColor = '#c084fc';
            } else if (row.isValueArea) {
                areaText = "Value Area";
                areaColor = '#818cf8';
            }
            drawLine("区域属性:", areaText, areaColor);
            
            const dayType = meta.dayType ? meta.dayType : "Normal";
            drawLine("日内结构:", dayType);
            
            // Draw metadata fields
            if (meta.actualFrequencyUsed) {
                drawLine("计算频率:", meta.actualFrequencyUsed);
            }
            if (meta.dataCoverageDays) {
                drawLine("覆盖天数:", meta.dataCoverageDays + " 天");
            }
            if (meta.profileStartTime && meta.profileEndTime) {
                const formatTime = (t) => t.length >= 16 ? t.slice(5, 16) : t;
                drawLine("计算区间:", `${formatTime(meta.profileStartTime)} 至 ${formatTime(meta.profileEndTime)}`);
            }
        } else {
            ctx.fillText("Volume Profile Details", tooltipX + 10, textY);
            textY += 18;
            
            drawLine("价格:", row.price.toFixed(1));
            drawLine("估算成交:", this.formatVolume(row.value));
            
            const totalVol = meta.totalVolume ? meta.totalVolume : 1;
            const percent = ((row.value / totalVol) * 100).toFixed(2) + "%";
            drawLine("成交比率:", percent);
            
            let areaText = "Outside VA";
            let areaColor = isDark ? '#9ca3af' : '#475569';
            if (row.isPoc) {
                areaText = "VPOC";
                areaColor = '#60a5fa';
            } else if (row.isHvn) {
                areaText = "HVN";
                areaColor = '#3b82f6';
            } else if (row.isLvn) {
                areaText = "LVN";
                areaColor = '#f43f5e';
            } else if (row.isValueArea) {
                areaText = "Value Area";
                areaColor = '#60a5fa';
            }
            drawLine("区域属性:", areaText, areaColor);
            
            const qualityText = meta.dataQuality === 'fallback' ? "近似估算 (15m)" : "完整精度";
            const qualityColor = meta.dataQuality === 'fallback' ? '#f59e0b' : '#10b981';
            drawLine("数据质量:", qualityText, qualityColor);
            
            // Draw metadata fields
            if (meta.actualFrequencyUsed) {
                drawLine("计算频率:", meta.actualFrequencyUsed + (meta.fallbackUsed ? " (已降级)" : ""));
            }
            if (meta.dataCoverageDays) {
                drawLine("覆盖天数:", meta.dataCoverageDays + " 天");
            }
            if (meta.profileStartTime && meta.profileEndTime) {
                const formatTime = (t) => t.length >= 16 ? t.slice(5, 16) : t;
                drawLine("计算区间:", `${formatTime(meta.profileStartTime)} 至 ${formatTime(meta.profileEndTime)}`);
            }
            if (meta.fallbackUsed && meta.fallbackReason) {
                drawLine("降级原因:", "1m数据覆盖不足");
            }
        }
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

        // Calculate TPO and Volume Profiles if requested
        const lastVisibleBar = visibleData[visibleData.length - 1];
        let tpoProfile = null;
        let tpoStep = 0;
        let endDate = null;
        if (this.tpoLevel !== 'none' && lastVisibleBar) {
            endDate = lastVisibleBar.date || (lastVisibleBar.datetime ? getTradingDate(lastVisibleBar.datetime, this.dailyDates) : null);
            if (endDate) {
                tpoProfile = this.getProfileData('tpo', this.tpoLevel, endDate);
                if (tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 1) {
                    tpoStep = tpoProfile.rows[1].price - tpoProfile.rows[0].price;
                }
            }
        }

        let vpProfile = null;
        let vpStep = 0;
        if (this.vpLevel !== 'none' && lastVisibleBar) {
            if (!endDate) {
                endDate = lastVisibleBar.date || (lastVisibleBar.datetime ? getTradingDate(lastVisibleBar.datetime, this.dailyDates) : null);
            }
            if (endDate) {
                vpProfile = this.getProfileData('volume', this.vpLevel, endDate);
                if (vpProfile && vpProfile.rows && vpProfile.rows.length > 1) {
                    vpStep = vpProfile.rows[1].price - vpProfile.rows[0].price;
                }
            }
        }

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

        const maxProfileWidth = chartWidth * 0.3;

        // Draw TPO Profile Histogram under K-lines
        if (tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 0) {
            const vaFillStyle = isDark ? 'rgba(139, 92, 246, 0.32)' : 'rgba(139, 92, 246, 0.22)';
            const nonVaFillStyle = isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)';
            
            tpoProfile.rows.forEach(row => {
                const yBottom = getPriceY(row.price - tpoStep / 2);
                const yTop = getPriceY(row.price + tpoStep / 2);
                const barHeight = Math.max(1, yBottom - yTop);
                
                if (yTop >= this.paddingTop - barHeight && yBottom <= this.paddingTop + priceHeight + barHeight) {
                    const barWidth = row.normalizedValue * maxProfileWidth;
                    ctx.fillStyle = row.isValueArea ? vaFillStyle : nonVaFillStyle;
                    ctx.fillRect(this.paddingLeft, yTop, barWidth, barHeight);
                }
            });
        }

        // Draw Volume Profile Histogram under K-lines
        if (vpProfile && vpProfile.rows && vpProfile.rows.length > 0) {
            const vaFillStyle = isDark ? 'rgba(59, 130, 246, 0.32)' : 'rgba(59, 130, 246, 0.22)';
            const nonVaFillStyle = isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)';
            
            vpProfile.rows.forEach(row => {
                const yBottom = getPriceY(row.price - vpStep / 2);
                const yTop = getPriceY(row.price + vpStep / 2);
                const barHeight = Math.max(1, yBottom - yTop);
                
                if (yTop >= this.paddingTop - barHeight && yBottom <= this.paddingTop + priceHeight + barHeight) {
                    const barWidth = row.normalizedValue * maxProfileWidth;
                    ctx.fillStyle = row.isValueArea ? vaFillStyle : nonVaFillStyle;
                    const xStart = w - this.paddingRight - barWidth;
                    ctx.fillRect(xStart, yTop, barWidth, barHeight);
                }
            });
        }

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

        // Draw TPO Reference levels on top of K-lines
        if (tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 0) {
            // TPO POC
            const yPoc = getPriceY(tpoProfile.poc);
            if (yPoc >= this.paddingTop && yPoc <= this.paddingTop + priceHeight) {
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, yPoc);
                ctx.lineTo(w - this.paddingRight, yPoc);
                ctx.stroke();
                
                ctx.fillStyle = '#c084fc';
                ctx.font = 'bold 9px Inter';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`TPO POC: ${tpoProfile.poc.toFixed(1)}`, this.paddingLeft + 5, yPoc - 2);
            }
            
            // TPO VAH & VAL
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            
            const yVah = getPriceY(tpoProfile.vah);
            if (yVah >= this.paddingTop && yVah <= this.paddingTop + priceHeight) {
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, yVah);
                ctx.lineTo(w - this.paddingRight, yVah);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
                ctx.font = '9px Inter';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`TPO VAH: ${tpoProfile.vah.toFixed(1)}`, this.paddingLeft + 5, yVah - 2);
            }
            
            const yVal = getPriceY(tpoProfile.val);
            if (yVal >= this.paddingTop && yVal <= this.paddingTop + priceHeight) {
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, yVal);
                ctx.lineTo(w - this.paddingRight, yVal);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
                ctx.font = '9px Inter';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`TPO VAL: ${tpoProfile.val.toFixed(1)}`, this.paddingLeft + 5, yVal - 2);
            }
            ctx.setLineDash([]);
        }

        // Draw Volume Profile Reference levels on top of K-lines
        if (vpProfile && vpProfile.rows && vpProfile.rows.length > 0) {
            // VP POC
            const yPoc = getPriceY(vpProfile.poc);
            if (yPoc >= this.paddingTop && yPoc <= this.paddingTop + priceHeight) {
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, yPoc);
                ctx.lineTo(w - this.paddingRight, yPoc);
                ctx.stroke();
                
                ctx.fillStyle = '#60a5fa';
                ctx.font = 'bold 9px Inter';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`VP POC: ${vpProfile.poc.toFixed(1)}`, w - this.paddingRight - 5, yPoc - 2);
            }
            
            // VP VAH & VAL
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            
            const yVah = getPriceY(vpProfile.vah);
            if (yVah >= this.paddingTop && yVah <= this.paddingTop + priceHeight) {
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, yVah);
                ctx.lineTo(w - this.paddingRight, yVah);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
                ctx.font = '9px Inter';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`VP VAH: ${vpProfile.vah.toFixed(1)}`, w - this.paddingRight - 5, yVah - 2);
            }
            
            const yVal = getPriceY(vpProfile.val);
            if (yVal >= this.paddingTop && yVal <= this.paddingTop + priceHeight) {
                ctx.beginPath();
                ctx.moveTo(this.paddingLeft, yVal);
                ctx.lineTo(w - this.paddingRight, yVal);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
                ctx.font = '9px Inter';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`VP VAL: ${vpProfile.val.toFixed(1)}`, w - this.paddingRight - 5, yVal - 2);
            }
            ctx.setLineDash([]);

            // Draw HVN & LVN lines
            const vpMaxProfileWidth = chartWidth * 0.3;
            const xStart = w - this.paddingRight - vpMaxProfileWidth;
            
            if (vpProfile.meta && vpProfile.meta.hvnList) {
                ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
                ctx.lineWidth = 1;
                vpProfile.meta.hvnList.forEach(hvn => {
                    const y = getPriceY(hvn);
                    if (y >= this.paddingTop && y <= this.paddingTop + priceHeight) {
                        ctx.beginPath();
                        ctx.moveTo(xStart, y);
                        ctx.lineTo(w - this.paddingRight, y);
                        ctx.stroke();
                        
                        ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
                        ctx.font = '8px Inter';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`HVN`, w - this.paddingRight - 5, y);
                    }
                });
            }
            
            if (vpProfile.meta && vpProfile.meta.lvnList) {
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                vpProfile.meta.lvnList.forEach(lvn => {
                    const y = getPriceY(lvn);
                    if (y >= this.paddingTop && y <= this.paddingTop + priceHeight) {
                        ctx.beginPath();
                        ctx.moveTo(xStart, y);
                        ctx.lineTo(w - this.paddingRight, y);
                        ctx.stroke();
                        
                        ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
                        ctx.font = '8px Inter';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`LVN`, w - this.paddingRight - 5, y);
                    }
                });
                ctx.setLineDash([]);
            }
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

        // Draw watermarks for insufficient data
        if (this.tpoLevel !== 'none' && (!tpoProfile || !tpoProfile.rows || tpoProfile.rows.length === 0 || tpoProfile.meta.dataQuality === "insufficient")) {
            ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.55)' : 'rgba(220, 38, 38, 0.7)';
            ctx.font = '11px Inter';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText("该区间缺少分钟级数据，无法构建对应 Profile", this.paddingLeft + 15, this.paddingTop + 40);
        }
        
        if (this.vpLevel !== 'none' && (!vpProfile || !vpProfile.rows || vpProfile.rows.length === 0 || vpProfile.meta.dataQuality === "insufficient")) {
            ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.55)' : 'rgba(220, 38, 38, 0.7)';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText("该区间缺少分钟级数据，无法构建对应 Profile", w - this.paddingRight - 15, this.paddingTop + 40);
        }

        // Draw profile tooltips if mouse is hovering on profiles
        if (this.mouseX >= this.paddingLeft && this.mouseX <= w - this.paddingRight &&
            this.mouseY >= this.paddingTop && this.mouseY <= this.paddingTop + priceHeight) {
            
            const hoverPrice = maxPrice - ((maxPrice - minPrice) * ((this.mouseY - this.paddingTop) / priceHeight));
            
            if (tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 0 && 
                this.mouseX >= this.paddingLeft && this.mouseX <= this.paddingLeft + maxProfileWidth) {
                const row = tpoProfile.rows.find(r => Math.abs(r.price - hoverPrice) <= tpoStep / 2);
                if (row) {
                    this.drawProfileTooltip('tpo', row, tpoProfile, this.mouseX, this.mouseY, w, h);
                }
            } else if (vpProfile && vpProfile.rows && vpProfile.rows.length > 0 && 
                       this.mouseX >= w - this.paddingRight - maxProfileWidth && this.mouseX <= w - this.paddingRight) {
                const row = vpProfile.rows.find(r => Math.abs(r.price - hoverPrice) <= vpStep / 2);
                if (row) {
                    this.drawProfileTooltip('volume', row, vpProfile, this.mouseX, this.mouseY, w, h);
                }
            }
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
