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
        
        // Drawing Tool States
        this.drawingMode = 'none'; // 'none', 'hline', 'polyline'
        this.allDrawings = {}; // { [symbol]: { hlines: [], polylines: [] } }
        this.selectedHLine = null;
        this.selectedPolyline = null;
        this.selectedVertexIndex = null;
        this.activePolyline = null;
        this.isDraggingDrawing = false;
        
        this.initEvents();
    }

    get drawings() {
        if (!this.symbol) return { hlines: [], polylines: [] };
        if (!this.allDrawings[this.symbol]) {
            this.allDrawings[this.symbol] = { hlines: [], polylines: [] };
        }
        return this.allDrawings[this.symbol];
    }

    getPriceHeightParams() {
        const w = this.logicalWidth || this.canvas.getBoundingClientRect().width;
        const h = this.logicalHeight || this.canvas.getBoundingClientRect().height;
        const hasVolume = this.indicators.volume;
        const priceChartHeightRatio = hasVolume ? 0.72 : 0.95;
        const chartWidth = w - this.paddingLeft - this.paddingRight;
        const totalChartHeight = h - this.paddingTop - this.paddingBottom;
        const priceHeight = totalChartHeight * priceChartHeightRatio;
        
        let maxPrice = -Infinity;
        let minPrice = Infinity;
        const visibleData = this.data.slice(this.visibleStart, this.visibleEnd);
        visibleData.forEach(d => {
            if (d.high > maxPrice) maxPrice = d.high;
            if (d.low < minPrice) minPrice = d.low;
        });
        const priceRange = maxPrice - minPrice;
        maxPrice += priceRange * 0.05;
        minPrice -= priceRange * 0.05;
        if (minPrice < 0) minPrice = 0;
        
        const candleWidth = chartWidth / Math.max(1, visibleData.length);
        
        return { w, h, chartWidth, priceHeight, maxPrice, minPrice, candleWidth };
    }

    priceFromY(y) {
        const { priceHeight, maxPrice, minPrice } = this.getPriceHeightParams();
        if (priceHeight <= 0) return 0;
        return maxPrice - ((y - this.paddingTop) / priceHeight) * (maxPrice - minPrice);
    }
    
    yFromPrice(price) {
        const { priceHeight, maxPrice, minPrice } = this.getPriceHeightParams();
        const range = maxPrice - minPrice;
        if (range <= 0) return this.paddingTop;
        return this.paddingTop + priceHeight * (1 - (price - minPrice) / range);
    }

    indexFromX(x) {
        const { candleWidth } = this.getPriceHeightParams();
        if (candleWidth <= 0) return 0;
        const relativeX = x - this.paddingLeft;
        const offsetIndex = Math.floor(relativeX / candleWidth);
        return Math.max(0, Math.min(this.data.length - 1, this.visibleStart + offsetIndex));
    }
    
    xFromIndex(index) {
        const { candleWidth } = this.getPriceHeightParams();
        return this.paddingLeft + ((index - this.visibleStart) * candleWidth) + (candleWidth / 2);
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
        this.selectedHLine = null;
        this.selectedPolyline = null;
        this.selectedVertexIndex = null;
        this.activePolyline = null;
        this.isDraggingDrawing = false;
        this.drawingMode = 'none';
        if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();

        // Default to showing 100% of data on desktop, but only 45 bars on mobile to prevent crowding
        if (window.innerWidth < 768) {
            const mobileCount = Math.min(this.data.length, 45);
            this.visibleStart = this.data.length - mobileCount;
            this.visibleEnd = this.data.length;
        } else {
            this.visibleStart = 0;
            this.visibleEnd = this.data.length;
        }
        
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
        this.profileCache = {}; // Reset profile cache on new data
        
        this.earliest30mDate = getEarliestTradingDate(this.bars30m, this.dailyDates);
        this.earliest1mDate = getEarliestTradingDate(this.bars1m, this.dailyDates);
        this.earliest5mDate = getEarliestTradingDate(this.bars5m, this.dailyDates);
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
            fallbackFrequencies = ['5m']; // Strictly no 15m for all VP
        }
        
        // ── Special path: Composite VP (Daily / Weekly) ──────────────────────────
        // AkShare free-tier minute data is naturally limited to ~15 days (5m) or ~2 days (1m).
        // Rather than requiring a full 20D / 40D window and hiding the profile as
        // "insufficient", we build with ALL available 1m or 5m bars and flag
        // dataQuality as "partial" when actual coverage < target.
        // No 15m / daily / weekly K-line fallback is allowed.
        if (type === 'volume' && level !== '30m') {
            const targetLookbackDays = level === 'daily' ? 20 : 40;
            
            // Choose best available frequency: 1m preferred, then 5m
            let activeBars = null;
            let actualFrequencyUsed = null;
            let fallbackUsed = false;
            
            if (this.bars1m && this.bars1m.length > 0) {
                activeBars = this.bars1m;
                actualFrequencyUsed = '1m';
            } else if (this.bars5m && this.bars5m.length > 0) {
                activeBars = this.bars5m;
                actualFrequencyUsed = '5m';
                fallbackUsed = true;
            }
            
            if (!activeBars || activeBars.length === 0) {
                const emptyProfile = {
                    type, level, symbol, endDate,
                    lookback: level === 'daily' ? '20D' : '8W',
                    poc: 0, vah: 0, val: 0, rangeHigh: 0, rangeLow: 0,
                    rows: [],
                    meta: {
                        profileLevel: level,
                        targetLookbackDays,
                        actualLookbackDays: 0,
                        dataQuality: 'insufficient',
                        insufficientReason: 'No 1m or 5m data available'
                    }
                };
                this.profileCache[cacheKey] = emptyProfile;
                return emptyProfile;
            }
            
            // Count unique trading days in the available bars
            const coveredDates = new Set(
                activeBars.map(b => getTradingDate(b.datetime || b.date, dailyDates))
            );
            const actualLookbackDays = coveredDates.size;
            
            const firstBar = activeBars[0];
            const lastBar  = activeBars[activeBars.length - 1];
            const earliestAvailable = firstBar.datetime || firstBar.date;
            const latestAvailable   = lastBar.datetime  || lastBar.date;
            
            const dataQuality = actualLookbackDays >= targetLookbackDays ? 'full' : 'partial';
            
            // Build with all available bars.
            // Pass actualLookbackDays so the builder selects exactly those trading dates.
            const profile = buildDailyCompositeVolume({
                bars1m: activeBars, tickSize, symbol, endDate, dailyDates,
                lookbackDays: actualLookbackDays
            });
            
            if (profile && profile.rows && profile.rows.length > 0) {
                if (!profile.meta) profile.meta = {};
                profile.meta.profileLevel         = level;
                profile.meta.targetLookbackDays   = targetLookbackDays;
                profile.meta.actualLookbackDays   = actualLookbackDays;
                profile.meta.dataCoverageDays     = actualLookbackDays;
                profile.meta.actualFrequencyUsed  = actualFrequencyUsed;
                profile.meta.fallbackUsed         = fallbackUsed;
                profile.meta.earliestAvailableTime = earliestAvailable;
                profile.meta.latestAvailableTime   = latestAvailable;
                profile.meta.dataQuality           = dataQuality;
                
                this.profileCache[cacheKey] = profile;
                return profile;
            }
            
            // Build returned empty (e.g. endDate outside data range)
            const emptyProfile = {
                type, level, symbol, endDate,
                lookback: level === 'daily' ? '20D' : '8W',
                poc: 0, vah: 0, val: 0, rangeHigh: 0, rangeLow: 0,
                rows: [],
                meta: {
                    profileLevel: level,
                    targetLookbackDays,
                    actualLookbackDays,
                    dataQuality: 'insufficient',
                    insufficientReason: 'Profile build returned no rows'
                }
            };
            this.profileCache[cacheKey] = emptyProfile;
            return emptyProfile;
        }
        // ── End Composite VP special path ────────────────────────────────────────
        
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
                    profileLevel: level,
                    preferredFrequency,
                    actualFrequencyUsed: preferredFrequency,
                    earliest30mDate: this.earliest30mDate,
                    earliest1mDate: this.earliest1mDate,
                    earliest5mDate: this.earliest5mDate,
                    currentChartDate: endDate,
                    dataQuality: "insufficient",
                    insufficientReason: availability.insufficientReason || "Data insufficient"
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
            }
        }
        
        if (profile) {
            // Enrich metadata
            if (!profile.meta) profile.meta = {};
            profile.meta.profileLevel = level;
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
                const endIdx = dailyDates.indexOf(endDate);
                if (endIdx !== -1) {
                    profile.meta.dataCoverageDays = 1; // 30m VP is always 1 day
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
        // TPO base: title + ProfileType + DataQuality + 价格 + TPO计数 + 区域属性 + 日内结构 = 6 content lines
        // VP base: title + ProfileType + DataQuality + 价格 + 估算成交 + 成交比率 + 区域属性 = 7 content lines
        let linesCount = type === 'tpo' ? 6 : 7;
        if (meta.actualFrequencyUsed) linesCount++; // Freq Used (conditional)
        if (meta.dataCoverageDays) linesCount++;
        if (meta.profileStartTime && meta.profileEndTime) linesCount++;
        if (type === 'volume' && meta.fallbackUsed && meta.fallbackReason) linesCount++;
        if (type === 'volume' && meta.dataQuality === 'partial' && meta.actualLookbackDays && meta.targetLookbackDays) linesCount++;
        
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
            
            // Profile Type
            const profileTypeLabel = meta.profileLevel === 'daily' ? 'Daily Composite TPO' :
                                     meta.profileLevel === 'weekly' ? 'Weekly Composite TPO' : '30m TPO';
            drawLine("Profile Type:", profileTypeLabel);
            
            // Actual Frequency Used
            if (meta.actualFrequencyUsed) {
                drawLine("Freq Used:", meta.actualFrequencyUsed);
            }
            
            // Data Quality
            const tpoQuality = meta.dataQuality || 'full';
            const tpoQualityColor = tpoQuality === 'full' ? '#10b981' : tpoQuality === 'fallback' ? '#f59e0b' : '#9ca3af';
            drawLine("Data Quality:", tpoQuality.toUpperCase(), tpoQualityColor);
            
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
            
            // Profile Type
            const vpTypeLabel = meta.profileLevel === 'daily' ? 'Daily Composite VP' :
                                meta.profileLevel === 'weekly' ? 'Weekly Composite VP' : '30m VP';
            drawLine("Profile Type:", vpTypeLabel);
            
            // Actual Frequency Used
            if (meta.actualFrequencyUsed) {
                drawLine("Freq Used:", meta.actualFrequencyUsed + (meta.fallbackUsed ? " (fallback)" : ""));
            }
            
            // Data Quality
            const vpQuality = meta.dataQuality || 'unknown';
            const vpQualityColor = vpQuality === 'full' ? '#10b981' :
                                   vpQuality === 'partial' ? '#f59e0b' :
                                   vpQuality === 'fallback' ? '#f59e0b' : '#9ca3af';
            drawLine("Data Quality:", vpQuality.toUpperCase(), vpQualityColor);
            
            // Partial coverage: show actual vs target days
            if (vpQuality === 'partial' && meta.actualLookbackDays && meta.targetLookbackDays) {
                drawLine("Coverage:", `${meta.actualLookbackDays}D / ${meta.targetLookbackDays}D target`, '#f59e0b');
            }
            
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

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const chartPanel = this.canvas.closest('.chart-panel');
        const isSimulatedFS = chartPanel && chartPanel.classList.contains('mobile-fullscreen-simulated');
        const isPortrait = window.matchMedia('(orientation: portrait)').matches;

        if (isSimulatedFS && isPortrait) {
            // Rotated 90deg + translateY(-100%).
            // Local X (u) = Y_viewport - rect.top
            // Local Y (v) = rect.width - (X_viewport - rect.left)
            const xLocal = clientY - rect.top;
            const yLocal = rect.width - (clientX - rect.left);
            return { x: xLocal, y: yLocal };
        } else {
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
    }

    getScrollbarPointerPos(e) {
        const chartPanel = this.canvas.closest('.chart-panel');
        const isSimulatedFS = chartPanel && chartPanel.classList.contains('mobile-fullscreen-simulated');
        const isPortrait = window.matchMedia('(orientation: portrait)').matches;
        
        let clientX = 0;
        let clientY = 0;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        if (isSimulatedFS && isPortrait) {
            return clientY;
        } else {
            return clientX;
        }
    }

    enterSimulatedFullscreen(chartPanel) {
        chartPanel.classList.add('mobile-fullscreen-simulated');
        document.body.classList.add('fullscreen-active');
        document.body.style.overflow = 'hidden';
        
        // Immediate resize and render
        this.resize();
        this.render();
        
        // Secondary delayed resize and render
        setTimeout(() => {
            this.resize();
            this.render();
        }, 100);
    }

    cleanupFullscreen() {
        const chartPanel = this.canvas.closest('.chart-panel');
        if (chartPanel) {
            chartPanel.classList.remove('mobile-fullscreen-simulated');
        }
        document.body.classList.remove('fullscreen-active');
        document.body.style.overflow = '';
        
        // Exit native fullscreen if active
        const fsElement = document.fullscreenElement || 
                          document.webkitFullscreenElement || 
                          document.mozFullScreenElement || 
                          document.msFullscreenElement;
        if (fsElement) {
            const exitFS = document.exitFullscreen || 
                           document.webkitExitFullscreen || 
                           document.mozCancelFullScreen || 
                           document.msExitFullscreen;
            if (exitFS) {
                try { exitFS.call(document); } catch (e) { console.error(e); }
            }
        }
        
        // Unlock screen orientation
        if (screen.orientation && screen.orientation.unlock) {
            try { screen.orientation.unlock(); } catch (e) {}
        }
        
        // Immediate resize and render
        this.resize();
        this.render();
        
        // Secondary delayed resize and render
        setTimeout(() => {
            this.resize();
            this.render();
        }, 100);
    }

    initEvents() {
        // Handle resizing
        window.addEventListener('resize', () => this.resize());

        // Mouse interactions for crosshair & panning & drawing
        this.canvas.addEventListener('mousemove', (e) => {
            const coords = this.getCanvasCoords(e);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            this.updateHoverIndex();
            
            const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
            if (chartWidth > 0 && this.mouseX >= this.paddingLeft && this.mouseX <= this.logicalWidth - this.paddingRight) {
                this.lastHoverPct = (this.mouseX - this.paddingLeft) / chartWidth;
            }
            
            // Dragging logic for drawings
            if (this.isDraggingDrawing) {
                if (this.selectedHLine) {
                    this.selectedHLine.price = this.priceFromY(this.mouseY);
                } else if (this.selectedPolyline && this.selectedVertexIndex !== null) {
                    this.selectedPolyline.points[this.selectedVertexIndex] = {
                        index: this.indexFromX(this.mouseX),
                        price: this.priceFromY(this.mouseY)
                    };
                }
            } else if (this.isPanning && this.data.length) { // Panning logic
                const visibleCount = this.visibleEnd - this.visibleStart;
                
                const clientCandleWidth = chartWidth / visibleCount;
                const dx = this.mouseX - this.panStartMouseX;
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

        // Start panning / drawing / selection
        this.canvas.addEventListener('mousedown', (e) => {
            const coords = this.getCanvasCoords(e);
            const mouseX = coords.x;
            const mouseY = coords.y;

            if (this.drawingMode !== 'none') {
                let found = false;
                const { priceHeight } = this.getPriceHeightParams();

                // 1. Check if near horizontal lines
                const yTol = 8;
                for (let hl of this.drawings.hlines) {
                    const y = this.yFromPrice(hl.price);
                    if (Math.abs(mouseY - y) < yTol) {
                        this.selectedHLine = hl;
                        this.selectedPolyline = null;
                        this.selectedVertexIndex = null;
                        this.isDraggingDrawing = true;
                        found = true;
                        break;
                    }
                }

                // 2. Check if near polyline vertices
                if (!found) {
                    const tol = 10;
                    for (let pl of this.drawings.polylines) {
                        for (let idxVal = 0; idxVal < pl.points.length; idxVal++) {
                            const pt = pl.points[idxVal];
                            const x = this.xFromIndex(pt.index);
                            const y = this.yFromPrice(pt.price);
                            if (Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2) < tol) {
                                this.selectedPolyline = pl;
                                this.selectedVertexIndex = idxVal;
                                this.selectedHLine = null;
                                this.isDraggingDrawing = true;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                // 3. Check if near polyline segments (distance from point to line segment)
                if (!found) {
                    const segTol = 8;
                    for (let pl of this.drawings.polylines) {
                        for (let idxVal = 0; idxVal < pl.points.length - 1; idxVal++) {
                            const x1 = this.xFromIndex(pl.points[idxVal].index);
                            const y1 = this.yFromPrice(pl.points[idxVal].price);
                            const x2 = this.xFromIndex(pl.points[idxVal + 1].index);
                            const y2 = this.yFromPrice(pl.points[idxVal + 1].price);

                            const A = mouseX - x1;
                            const B = mouseY - y1;
                            const C = x2 - x1;
                            const D = y2 - y1;

                            const dot = A * C + B * D;
                            const lenSq = C * C + D * D;
                            let param = -1;
                            if (lenSq !== 0) param = dot / lenSq;

                            let xx, yy;
                            if (param < 0) {
                                xx = x1;
                                yy = y1;
                            } else if (param > 1) {
                                xx = x2;
                                yy = y2;
                            } else {
                                xx = x1 + param * C;
                                yy = y1 + param * D;
                            }

                            const dist = Math.sqrt((mouseX - xx) ** 2 + (mouseY - yy) ** 2);
                            if (dist < segTol) {
                                this.selectedPolyline = pl;
                                this.selectedVertexIndex = null;
                                this.selectedHLine = null;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                if (found) {
                    if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();
                    this.render();
                    return;
                }

                // If not clicking an existing drawing, we add a new one
                const currentPrice = this.priceFromY(mouseY);
                const currentIndex = this.indexFromX(mouseX);

                if (mouseY >= this.paddingTop && mouseY <= this.paddingTop + priceHeight && mouseX >= this.paddingLeft && mouseX <= this.logicalWidth - this.paddingRight) {
                    if (this.drawingMode === 'hline') {
                        const newHLine = { price: currentPrice };
                        this.drawings.hlines.push(newHLine);
                        this.selectedHLine = newHLine;
                        this.selectedPolyline = null;
                        this.isDraggingDrawing = true;
                    } else if (this.drawingMode === 'polyline') {
                        if (!this.activePolyline) {
                            const newPoly = { points: [{ index: currentIndex, price: currentPrice }] };
                            this.drawings.polylines.push(newPoly);
                            this.activePolyline = newPoly;
                            this.selectedPolyline = newPoly;
                            this.selectedHLine = null;
                        } else {
                            this.activePolyline.points.push({ index: currentIndex, price: currentPrice });
                            this.selectedPolyline = this.activePolyline;
                            this.selectedHLine = null;
                        }
                    }
                    if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();
                    this.render();
                    return;
                }
            }

            // Normal panning start
            this.isPanning = true;
            this.panStartMouseX = mouseX;
            this.panStartStartIdx = this.visibleStart;
        });

        // Release mouse drag globally
        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.isDraggingScrollbar = false;
            this.isDraggingDrawing = false;
        });

        window.addEventListener('touchend', () => {
            this.isPanning = false;
            this.isDraggingScrollbar = false;
            this.isDraggingDrawing = false;
        });

        // Centered Wheel Zooming
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.data.length) return;
            e.preventDefault();
            
            const coords = this.getCanvasCoords(e);
            const clientMouseX = coords.x;
            
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
            const coords = this.getCanvasCoords(e);
            const touchX = coords.x;
            const touchY = coords.y;
            
            if (this.drawingMode !== 'none') {
                e.preventDefault();
                let found = false;
                const { priceHeight } = this.getPriceHeightParams();

                // 1. Check if near horizontal lines
                const yTol = 15;
                for (let hl of this.drawings.hlines) {
                    const y = this.yFromPrice(hl.price);
                    if (Math.abs(touchY - y) < yTol) {
                        this.selectedHLine = hl;
                        this.selectedPolyline = null;
                        this.selectedVertexIndex = null;
                        this.isDraggingDrawing = true;
                        found = true;
                        break;
                    }
                }

                // 2. Check if near polyline vertices
                if (!found) {
                    const tol = 18;
                    for (let pl of this.drawings.polylines) {
                        for (let idxVal = 0; idxVal < pl.points.length; idxVal++) {
                            const pt = pl.points[idxVal];
                            const x = this.xFromIndex(pt.index);
                            const y = this.yFromPrice(pt.price);
                            if (Math.sqrt((touchX - x) ** 2 + (touchY - y) ** 2) < tol) {
                                this.selectedPolyline = pl;
                                this.selectedVertexIndex = idxVal;
                                this.selectedHLine = null;
                                this.isDraggingDrawing = true;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                // 3. Check if near polyline segments
                if (!found) {
                    const segTol = 15;
                    for (let pl of this.drawings.polylines) {
                        for (let idxVal = 0; idxVal < pl.points.length - 1; idxVal++) {
                            const x1 = this.xFromIndex(pl.points[idxVal].index);
                            const y1 = this.yFromPrice(pl.points[idxVal].price);
                            const x2 = this.xFromIndex(pl.points[idxVal + 1].index);
                            const y2 = this.yFromPrice(pl.points[idxVal + 1].price);

                            const A = touchX - x1;
                            const B = touchY - y1;
                            const C = x2 - x1;
                            const D = y2 - y1;

                            const dot = A * C + B * D;
                            const lenSq = C * C + D * D;
                            let param = -1;
                            if (lenSq !== 0) param = dot / lenSq;

                            let xx, yy;
                            if (param < 0) {
                                xx = x1;
                                yy = y1;
                            } else if (param > 1) {
                                xx = x2;
                                yy = y2;
                            } else {
                                xx = x1 + param * C;
                                yy = y1 + param * D;
                            }

                            const dist = Math.sqrt((touchX - xx) ** 2 + (touchY - yy) ** 2);
                            if (dist < segTol) {
                                this.selectedPolyline = pl;
                                this.selectedVertexIndex = null;
                                this.selectedHLine = null;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                if (found) {
                    if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();
                    this.render();
                    return;
                }

                // If not clicking an existing drawing, we add a new one
                const currentPrice = this.priceFromY(touchY);
                const currentIndex = this.indexFromX(touchX);

                if (touchY >= this.paddingTop && touchY <= this.paddingTop + priceHeight && touchX >= this.paddingLeft && touchX <= this.logicalWidth - this.paddingRight) {
                    if (this.drawingMode === 'hline') {
                        const newHLine = { price: currentPrice };
                        this.drawings.hlines.push(newHLine);
                        this.selectedHLine = newHLine;
                        this.selectedPolyline = null;
                        this.isDraggingDrawing = true;
                    } else if (this.drawingMode === 'polyline') {
                        if (!this.activePolyline) {
                            const newPoly = { points: [{ index: currentIndex, price: currentPrice }] };
                            this.drawings.polylines.push(newPoly);
                            this.activePolyline = newPoly;
                            this.selectedPolyline = newPoly;
                            this.selectedHLine = null;
                        } else {
                            this.activePolyline.points.push({ index: currentIndex, price: currentPrice });
                            this.selectedPolyline = this.activePolyline;
                            this.selectedHLine = null;
                        }
                    }
                    if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();
                    this.render();
                    return;
                }
            }

            if (e.touches.length === 1) {
                // Single finger touch -> swipe to pan
                this.isTouchPanning = true;
                this.isTouchZooming = false;
                this.lastTouchX = touchX;
                this.panStartStartIdx = this.visibleStart;
            } else if (e.touches.length === 2) {
                // Two fingers pinch -> zoom
                this.isTouchZooming = true;
                this.isTouchPanning = false;
                
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                this.touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                
                const coords1 = this.getCanvasCoords({ touches: [t1] });
                const coords2 = this.getCanvasCoords({ touches: [t2] });
                const midX = (coords1.x + coords2.x) / 2;
                
                const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
                let pct = (midX - this.paddingLeft) / chartWidth;
                if (pct < 0) pct = 0;
                if (pct > 1) pct = 1;
                this.touchStartMidPct = pct;
                
                // Track initial range for zoom
                this.zoomStartStartIdx = this.visibleStart;
                this.zoomStartEndIdx = this.visibleEnd;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.data.length) return;
            
            // Prevent default page scroll/bounce ONLY when actively interacting
            const isInteracting = this.isTouchPanning || this.isTouchZooming || this.isDraggingDrawing;
            if (isInteracting) {
                e.preventDefault();
            }
            
            if (this.isDraggingDrawing) {
                const coords = this.getCanvasCoords(e);
                const touchX = coords.x;
                const touchY = coords.y;

                if (this.selectedHLine) {
                    this.selectedHLine.price = this.priceFromY(touchY);
                } else if (this.selectedPolyline && this.selectedVertexIndex !== null) {
                    this.selectedPolyline.points[this.selectedVertexIndex] = {
                        index: this.indexFromX(touchX),
                        price: this.priceFromY(touchY)
                    };
                }
            } else if (this.isTouchPanning && e.touches.length === 1) {
                const coords = this.getCanvasCoords(e);
                const touchX = coords.x;
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
                    
                    const startCount = this.zoomStartEndIdx - this.zoomStartStartIdx;
                    let newCount = Math.round(startCount * factor);
                    
                    if (newCount < 10) newCount = 10;
                    if (newCount > this.data.length) newCount = this.data.length;
                    
                    const diff = startCount - newCount;
                    let newStart = this.zoomStartStartIdx + Math.round(diff * this.touchStartMidPct);
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
                    this.render();
                }
            }
        }, { passive: false });

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

        // Handle resizing and locking/cleanup when entering/exiting native fullscreen mode
        const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        fsEvents.forEach(evtName => {
            document.addEventListener(evtName, () => {
                const fsElement = document.fullscreenElement || 
                                  document.webkitFullscreenElement || 
                                  document.mozFullScreenElement || 
                                  document.msFullscreenElement;
                
                if (fsElement) {
                    // Entered native fullscreen. If on mobile, attempt to lock orientation
                    if (window.innerWidth < 768 && screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => {});
                    }
                    this.resize();
                    this.render();
                } else {
                    // Exited native fullscreen. Run unified cleanup
                    this.cleanupFullscreen();
                }
            });
        });

        // Bind control elements (zoom buttons & scrollbar slider)
        this.initControls();
    }

    initControls() {
        const drawHLineBtn = document.getElementById('drawHLineBtn');
        const drawPolylineBtn = document.getElementById('drawPolylineBtn');
        const finishPolylineBtn = document.getElementById('finishPolylineBtn');
        const deleteDrawingBtn = document.getElementById('deleteDrawingBtn');

        const updateBtnStates = () => {
            if (drawHLineBtn) {
                if (this.drawingMode === 'hline') {
                    drawHLineBtn.classList.add('active');
                } else {
                    drawHLineBtn.classList.remove('active');
                }
            }
            if (drawPolylineBtn) {
                if (this.drawingMode === 'polyline') {
                    drawPolylineBtn.classList.add('active');
                } else {
                    drawPolylineBtn.classList.remove('active');
                }
            }
            if (finishPolylineBtn) {
                if (this.drawingMode === 'polyline') {
                    finishPolylineBtn.style.display = 'inline-flex';
                } else {
                    finishPolylineBtn.style.display = 'none';
                }
            }
            if (deleteDrawingBtn) {
                if (this.drawingMode !== 'none' && (this.selectedHLine !== null || this.selectedPolyline !== null)) {
                    deleteDrawingBtn.style.display = 'inline-flex';
                } else {
                    deleteDrawingBtn.style.display = 'none';
                }
            }
        };

        if (drawHLineBtn) {
            drawHLineBtn.addEventListener('click', () => {
                if (this.drawingMode === 'hline') {
                    this.drawingMode = 'none';
                } else {
                    this.drawingMode = 'hline';
                    if (this.activePolyline) {
                        this.activePolyline = null;
                    }
                }
                this.selectedHLine = null;
                this.selectedPolyline = null;
                this.selectedVertexIndex = null;
                updateBtnStates();
                this.render();
            });
        }

        if (drawPolylineBtn) {
            drawPolylineBtn.addEventListener('click', () => {
                if (this.drawingMode === 'polyline') {
                    this.drawingMode = 'none';
                    this.activePolyline = null;
                } else {
                    this.drawingMode = 'polyline';
                }
                this.selectedHLine = null;
                this.selectedPolyline = null;
                this.selectedVertexIndex = null;
                updateBtnStates();
                this.render();
            });
        }

        if (finishPolylineBtn) {
            finishPolylineBtn.addEventListener('click', () => {
                this.activePolyline = null;
                this.drawingMode = 'none';
                this.selectedHLine = null;
                this.selectedPolyline = null;
                this.selectedVertexIndex = null;
                updateBtnStates();
                this.render();
            });
        }

        if (deleteDrawingBtn) {
            deleteDrawingBtn.addEventListener('click', () => {
                if (this.selectedHLine) {
                    const idx = this.drawings.hlines.indexOf(this.selectedHLine);
                    if (idx > -1) this.drawings.hlines.splice(idx, 1);
                    this.selectedHLine = null;
                } else if (this.selectedPolyline) {
                    const idx = this.drawings.polylines.indexOf(this.selectedPolyline);
                    if (idx > -1) this.drawings.polylines.splice(idx, 1);
                    this.selectedPolyline = null;
                    this.selectedVertexIndex = null;
                    this.activePolyline = null;
                }
                updateBtnStates();
                this.render();
            });
        }

        this.updateDrawingBtnStates = updateBtnStates;

        const fullscreenBtn = document.getElementById('chartFullscreen');
        const track = document.getElementById('scrollbarTrack');
        const handle = document.getElementById('scrollbarHandle');

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const chartPanel = this.canvas.closest('.chart-panel');
                if (!chartPanel) return;
                
                const isNativeFS = !!(document.fullscreenElement || 
                                     document.webkitFullscreenElement || 
                                     document.mozFullScreenElement || 
                                     document.msFullscreenElement);
                const isSimulatedFS = chartPanel.classList.contains('mobile-fullscreen-simulated');
                
                if (isNativeFS || isSimulatedFS) {
                    // Unified exit from fullscreen
                    this.cleanupFullscreen();
                    return;
                }
                
                // Entering fullscreen
                // Detect iOS Safari / mobile view to force simulated fullscreen
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                const useSimulated = isIOS && window.innerWidth < 768;
                
                if (!useSimulated) {
                    const requestFS = chartPanel.requestFullscreen || 
                                      chartPanel.webkitRequestFullscreen || 
                                      chartPanel.mozRequestFullScreen || 
                                      chartPanel.msRequestFullscreen;
                    if (requestFS) {
                        requestFS.call(chartPanel).catch(err => {
                            console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
                            this.enterSimulatedFullscreen(chartPanel);
                        });
                    } else {
                        this.enterSimulatedFullscreen(chartPanel);
                    }
                } else {
                    // iOS mobile Safari uses simulated fullscreen to enable custom portrait rotation
                    this.enterSimulatedFullscreen(chartPanel);
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
                this.dragStartMouseX = this.getScrollbarPointerPos(e);
                this.dragStartHandleLeft = handle.offsetLeft;
                e.stopPropagation();
            });

            handle.addEventListener('touchstart', (e) => {
                this.isDraggingScrollbar = true;
                this.dragStartMouseX = this.getScrollbarPointerPos(e);
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

                const dx = this.getScrollbarPointerPos(e) - this.dragStartMouseX;
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
                
                // Prevent default scrolling only when actively dragging the scrollbar
                e.preventDefault();

                const trackWidth = track.getBoundingClientRect().width;
                const handleWidth = handle.getBoundingClientRect().width;
                const maxLeft = trackWidth - handleWidth;
                if (maxLeft <= 0) return;

                const dx = this.getScrollbarPointerPos(e) - this.dragStartMouseX;
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
            }, { passive: false });
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

        try {
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

        // Draw boundary warning overlays for TPO / VP (insufficient or partial)
        // Format: line 1 = boundary notice, line 2 = current date only (no quality tag in chart area)
        const tpoNeedsWarning = this.tpoLevel !== 'none' && tpoProfile &&
            (!tpoProfile.rows || tpoProfile.rows.length === 0 ||
             tpoProfile.meta.dataQuality === 'insufficient' ||
             tpoProfile.meta.dataQuality === 'partial');
        
        if (tpoNeedsWarning) {
            const x = this.paddingLeft + 15;
            const y = this.paddingTop + 45;
            
            ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.75)' : 'rgba(100, 116, 139, 0.85)';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            const levelNames = { '30m': '30m TPO', 'daily': '日 TPO', 'weekly': '周 TPO' };
            const lvlName = levelNames[this.tpoLevel] || this.tpoLevel;
            
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(`当前区间早于标准 ${lvlName} 数据边界。`, x, y);
            
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`当前区间：${endDate || '未知'}`, x, y + 18);
        }
        
        const vpNeedsWarning = this.vpLevel !== 'none' && vpProfile &&
            (!vpProfile.rows || vpProfile.rows.length === 0 ||
             vpProfile.meta.dataQuality === 'insufficient' ||
             vpProfile.meta.dataQuality === 'partial');
        
        if (vpNeedsWarning) {
            const x = w - this.paddingRight - 15;
            const y = this.paddingTop + 45;
            
            ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.75)' : 'rgba(100, 116, 139, 0.85)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            
            const levelNames = { '30m': '30m VP', 'daily': '日 VP', 'weekly': '周 VP' };
            const lvlName = levelNames[this.vpLevel] || this.vpLevel;
            
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(`当前区间早于标准 ${lvlName} 数据边界。`, x, y);
            
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`当前区间：${endDate || '未知'}`, x, y + 18);
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
        // Render drawings
        if (this.drawings) {
            // 1. Draw Horizontal Lines
            this.drawings.hlines.forEach(hline => {
                const y = this.yFromPrice(hline.price);
                if (y >= this.paddingTop && y <= this.paddingTop + priceHeight) {
                    const isSelected = (hline === this.selectedHLine);
                    ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(245, 158, 11, 0.85)';
                    ctx.lineWidth = isSelected ? 2 : 1.5;
                    ctx.beginPath();
                    ctx.moveTo(this.paddingLeft, y);
                    ctx.lineTo(w - this.paddingRight, y);
                    ctx.stroke();

                    // Draw handle in the middle of the line
                    const midX = this.paddingLeft + (w - this.paddingRight - this.paddingLeft) / 2;
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = isSelected ? '#3b82f6' : '#f59e0b';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(midX, y, isSelected ? 5 : 3.5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Show price text label on the left side of the line
                    ctx.fillStyle = isSelected ? '#3b82f6' : '#f59e0b';
                    ctx.font = '9px Inter';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(hline.price.toFixed(1), this.paddingLeft + 5, y - 3);
                }
            });

            // 2. Draw Polylines
            this.drawings.polylines.forEach(polyline => {
                if (polyline.points && polyline.points.length > 0) {
                    const isSelected = (polyline === this.selectedPolyline);
                    ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(16, 185, 129, 0.85)';
                    ctx.lineWidth = isSelected ? 2 : 1.5;
                    
                    // Draw lines
                    ctx.beginPath();
                    polyline.points.forEach((pt, idxVal) => {
                        const x = this.xFromIndex(pt.index);
                        const y = this.yFromPrice(pt.price);
                        if (idxVal === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.stroke();

                    // Draw vertices
                    polyline.points.forEach((pt, idxVal) => {
                        const x = this.xFromIndex(pt.index);
                        const y = this.yFromPrice(pt.price);
                        
                        // Only draw if within bounds
                        if (x >= this.paddingLeft && x <= w - this.paddingRight && y >= this.paddingTop && y <= this.paddingTop + priceHeight) {
                            const isVertexSelected = isSelected && (idxVal === this.selectedVertexIndex);
                            ctx.fillStyle = '#ffffff';
                            ctx.strokeStyle = isVertexSelected ? '#ef4444' : '#3b82f6';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.arc(x, y, isVertexSelected ? 5 : 4, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.stroke();
                        }
                    });
                }
            });
        }

        // Update custom scrollbar handle position
        const handle = document.getElementById('scrollbarHandle');
        const track = document.getElementById('scrollbarTrack');
        if (handle && track && this.data.length) {
            const trackWidth = track.getBoundingClientRect().width;
            if (trackWidth > 0) {
                const visibleCount = this.visibleEnd - this.visibleStart;
                let handleWidth;
                
                if (visibleCount >= this.data.length) {
                    handleWidth = trackWidth;
                } else {
                    const minRatio = 0.20;
                    const maxRatio = 0.50;
                    let ratio = maxRatio;
                    
                    if (this.data.length > 50) {
                        const t = (this.data.length - 50) / (1000 - 50);
                        ratio = maxRatio - t * (maxRatio - minRatio);
                        if (ratio < minRatio) ratio = minRatio;
                    }
                    
                    handleWidth = trackWidth * ratio;
                    if (handleWidth < 30) handleWidth = 30;
                    if (handleWidth > trackWidth) handleWidth = trackWidth;
                }
                
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
        } catch (err) {
            console.error("Render crash:", err);
            const ctx = this.ctx;
            ctx.fillStyle = '#ef4444';
            ctx.font = '14px Inter';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText("Render Error: " + err.message, 20, 50);
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
