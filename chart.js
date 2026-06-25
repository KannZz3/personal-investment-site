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
            ma5: false,
            ma10: false,
            ma20: false,
            ma40: false,
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
        this.lastSymbol = '';
        this.tpoLevel = 'none';
        this.vpLevel = 'none';
        this.profileDisplayMode = 'confluence'; // 'confluence', 'distribution', 'full'
        this.bars1m = [];
        this.bars5m = [];
        this.bars15m = [];
        this.bars30m = [];
        this.bars60m = [];
        this.dailyDates = [];
        this.profileCache = {};
        this.selectedBarIndex = -1;
        this.lastValidMouseX = -1;
        this.lastValidMouseY = -1;
        
        // Drawing Tool States
        this.drawingMode = 'none'; // 'none', 'hline', 'trendline', 'polyline'
        this.allDrawings = {}; // { [symbol]: { hlines: [], trendlines: [], polylines: [] } }
        this.selectedHLine = null;
        this.selectedTrendLine = null;
        this.selectedPolyline = null;
        this.selectedVertexIndex = null;
        this.activeTrendLine = null;
        this.activePolyline = null;
        this.isDraggingDrawing = false;
        this.drawingStorageKey = 'shan_feng_gu_drawings_v1';
        this.lastDrawingHit = null;
        this.lastDrawingHitIndex = 0;
        this.loadDrawings();
        
        this.initEvents();
    }

    get drawings() {
        if (!this.symbol) return { hlines: [], trendlines: [], polylines: [] };
        if (!this.allDrawings[this.symbol]) {
            this.allDrawings[this.symbol] = { hlines: [], trendlines: [], polylines: [] };
        }
        if (!this.allDrawings[this.symbol].trendlines) this.allDrawings[this.symbol].trendlines = [];
        if (!this.allDrawings[this.symbol].polylines) this.allDrawings[this.symbol].polylines = [];
        if (!this.allDrawings[this.symbol].hlines) this.allDrawings[this.symbol].hlines = [];
        return this.allDrawings[this.symbol];
    }

    loadDrawings() {
        try {
            const raw = localStorage.getItem(this.drawingStorageKey);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved && typeof saved === 'object') {
                Object.keys(saved).forEach(symbol => {
                    const bucket = saved[symbol] || {};
                    this.allDrawings[symbol] = {
                        hlines: Array.isArray(bucket.hlines) ? bucket.hlines : [],
                        trendlines: Array.isArray(bucket.trendlines) ? bucket.trendlines : [],
                        polylines: Array.isArray(bucket.polylines) ? bucket.polylines : []
                    };
                });
            }
        } catch (error) {
            console.warn('Failed to load chart drawings:', error);
        }
    }

    saveDrawings() {
        try {
            localStorage.setItem(this.drawingStorageKey, JSON.stringify(this.allDrawings));
        } catch (error) {
            console.warn('Failed to save chart drawings:', error);
        }
    }

    getPriceHeightParams() {
        const w = this.logicalWidth || this.canvas.clientWidth;
        const h = this.logicalHeight || this.canvas.clientHeight;
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

    getEventCoords(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
        const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
        
        if (isSimulatedFS && isPortrait) {
            const H = this.canvas.clientHeight;
            const localX = clientY - rect.top;
            const localY = H - (clientX - rect.left);
            return { x: localX, y: localY };
        } else {
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
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

    clampDrawingPoint(x, y) {
        const { priceHeight } = this.getPriceHeightParams();
        const clampedX = Math.max(this.paddingLeft, Math.min(this.logicalWidth - this.paddingRight, x));
        const clampedY = Math.max(this.paddingTop, Math.min(this.paddingTop + priceHeight, y));
        return {
            index: this.indexFromX(clampedX),
            price: this.priceFromY(clampedY)
        };
    }

    setSelectedDrawing(hit) {
        this.selectedHLine = hit?.type === 'hline' ? hit.target : null;
        this.selectedTrendLine = hit?.type === 'trendline' ? hit.target : null;
        this.selectedPolyline = hit?.type === 'polyline' ? hit.target : null;
        this.selectedVertexIndex = Number.isInteger(hit?.vertexIndex) ? hit.vertexIndex : null;
        this.isDraggingDrawing = !!hit?.draggable;
    }

    getDrawingIdentity(hit) {
        if (!hit) return '';
        const bucket = this.drawings;
        let idx = -1;
        if (hit.type === 'hline') idx = bucket.hlines.indexOf(hit.target);
        if (hit.type === 'trendline') idx = bucket.trendlines.indexOf(hit.target);
        if (hit.type === 'polyline') idx = bucket.polylines.indexOf(hit.target);
        const vertex = Number.isInteger(hit.vertexIndex) ? hit.vertexIndex : 'body';
        return `${hit.type}:${idx}:${vertex}`;
    }

    cycleDrawingHit(candidates, x, y) {
        if (!candidates.length) return null;
        candidates.sort((a, b) => a.distance - b.distance);
        const uniqueCandidates = [];
        const seen = new Set();
        for (const candidate of candidates) {
            const identity = this.getDrawingIdentity(candidate);
            if (seen.has(identity)) continue;
            seen.add(identity);
            uniqueCandidates.push(candidate);
        }
        candidates = uniqueCandidates;
        if (!candidates.length) return null;
        const clickKey = `${Math.round(x / 6)}:${Math.round(y / 6)}`;
        const sameSpot = this.lastDrawingHit && this.lastDrawingHit.key === clickKey;
        const startIndex = sameSpot ? (this.lastDrawingHitIndex + 1) % candidates.length : 0;
        const selected = candidates[startIndex];
        this.lastDrawingHit = { key: clickKey, identity: this.getDrawingIdentity(selected) };
        this.lastDrawingHitIndex = startIndex;
        return selected;
    }

    distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = (A * C + B * D) / lenSq;

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

        return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
    }

    getTrendLineRenderPoints(trendline) {
        if (!trendline || !trendline.points || trendline.points.length < 2) return null;
        const [p1, p2] = trendline.points;
        const x1 = this.xFromIndex(p1.index);
        const y1 = this.yFromPrice(p1.price);
        const x2 = this.xFromIndex(p2.index);
        const y2 = this.yFromPrice(p2.price);
        const left = this.paddingLeft;
        const right = this.logicalWidth - this.paddingRight;
        const top = this.paddingTop;
        const bottom = this.paddingTop + this.getPriceHeightParams().priceHeight;

        if (Math.abs(x2 - x1) < 0.001) {
            return { x1, y1: top, x2, y2: bottom };
        }

        const slope = (y2 - y1) / (x2 - x1);
        return {
            x1: left,
            y1: y1 + slope * (left - x1),
            x2: right,
            y2: y1 + slope * (right - x1)
        };
    }

    findNearestTrendLine(px, py, tolerance) {
        let nearest = null;
        let nearestDistance = Infinity;

        for (let tl of this.drawings.trendlines) {
            if (!tl.points || tl.points.length < 2) continue;
            const renderLine = this.getTrendLineRenderPoints(tl);
            if (!renderLine) continue;
            const extendedDistance = this.distanceToSegment(px, py, renderLine.x1, renderLine.y1, renderLine.x2, renderLine.y2);

            const [p1, p2] = tl.points;
            const anchorDistance = this.distanceToSegment(
                px,
                py,
                this.xFromIndex(p1.index),
                this.yFromPrice(p1.price),
                this.xFromIndex(p2.index),
                this.yFromPrice(p2.price)
            );

            const distance = Math.min(extendedDistance, anchorDistance);
            if (distance < nearestDistance) {
                nearest = tl;
                nearestDistance = distance;
            }
        }

        return nearestDistance <= tolerance ? nearest : null;
    }

    findNearestTrendLineHandle(px, py, tolerance) {
        let nearest = null;
        let nearestDistance = Infinity;

        for (let tl of this.drawings.trendlines) {
            if (!tl.points || tl.points.length < 2) continue;
            const renderLine = this.getTrendLineRenderPoints(tl);
            if (!renderLine) continue;
            const extendedDistance = this.distanceToSegment(px, py, renderLine.x1, renderLine.y1, renderLine.x2, renderLine.y2);

            const [p1, p2] = tl.points;
            const x1 = this.xFromIndex(p1.index);
            const y1 = this.yFromPrice(p1.price);
            const x2 = this.xFromIndex(p2.index);
            const y2 = this.yFromPrice(p2.price);
            const anchorDistance = this.distanceToSegment(px, py, x1, y1, x2, y2);

            const distance = Math.min(extendedDistance, anchorDistance);
            if (distance < nearestDistance) {
                const d1 = Math.hypot(px - x1, py - y1);
                const d2 = Math.hypot(px - x2, py - y2);
                nearest = {
                    trendline: tl,
                    vertexIndex: d1 <= d2 ? 0 : 1
                };
                nearestDistance = distance;
            }
        }

        return nearestDistance <= tolerance ? nearest : null;
    }

    findNearestHLine(py, tolerance) {
        let nearest = null;
        let nearestDistance = Infinity;

        for (let hl of this.drawings.hlines) {
            const y = this.yFromPrice(hl.price);
            const distance = Math.abs(py - y);
            if (distance < nearestDistance) {
                nearest = hl;
                nearestDistance = distance;
            }
        }

        return nearestDistance <= tolerance ? nearest : null;
    }

    findNearestPolyline(px, py, tolerance) {
        let nearest = null;
        let nearestDistance = Infinity;

        for (let pl of this.drawings.polylines) {
            if (!pl.points || pl.points.length < 2) continue;
            for (let idxVal = 0; idxVal < pl.points.length - 1; idxVal++) {
                const x1 = this.xFromIndex(pl.points[idxVal].index);
                const y1 = this.yFromPrice(pl.points[idxVal].price);
                const x2 = this.xFromIndex(pl.points[idxVal + 1].index);
                const y2 = this.yFromPrice(pl.points[idxVal + 1].price);
                const distance = this.distanceToSegment(px, py, x1, y1, x2, y2);
                if (distance < nearestDistance) {
                    nearest = pl;
                    nearestDistance = distance;
                }
            }
        }

        return nearestDistance <= tolerance ? nearest : null;
    }

    findNearestPolylineSegment(px, py, tolerance) {
        let nearest = null;
        let nearestDistance = Infinity;

        for (let pl of this.drawings.polylines) {
            if (!pl.points || pl.points.length < 2) continue;
            for (let idxVal = 0; idxVal < pl.points.length - 1; idxVal++) {
                const x1 = this.xFromIndex(pl.points[idxVal].index);
                const y1 = this.yFromPrice(pl.points[idxVal].price);
                const x2 = this.xFromIndex(pl.points[idxVal + 1].index);
                const y2 = this.yFromPrice(pl.points[idxVal + 1].price);
                const distance = this.distanceToSegment(px, py, x1, y1, x2, y2);
                if (distance < nearestDistance) {
                    const d1 = Math.hypot(px - x1, py - y1);
                    const d2 = Math.hypot(px - x2, py - y2);
                    nearest = {
                        polyline: pl,
                        vertexIndex: d1 <= d2 ? idxVal : idxVal + 1
                    };
                    nearestDistance = distance;
                }
            }
        }

        return nearestDistance <= tolerance ? nearest : null;
    }

    getDrawingHitCandidates(px, py, { vertexTol = 14, bodyTol = 12 } = {}) {
        const candidates = [];

        for (let hl of this.drawings.hlines) {
            const y = this.yFromPrice(hl.price);
            const distance = Math.abs(py - y);
            if (distance <= bodyTol) {
                candidates.push({
                    type: 'hline',
                    target: hl,
                    vertexIndex: null,
                    distance,
                    draggable: true
                });
            }
        }

        for (let tl of this.drawings.trendlines) {
            if (!tl.points || tl.points.length < 2) continue;
            tl.points.forEach((pt, idxVal) => {
                const x = this.xFromIndex(pt.index);
                const y = this.yFromPrice(pt.price);
                const distance = Math.hypot(px - x, py - y);
                if (distance <= vertexTol) {
                    candidates.push({
                        type: 'trendline',
                        target: tl,
                        vertexIndex: idxVal,
                        distance,
                        draggable: true
                    });
                }
            });

            const renderLine = this.getTrendLineRenderPoints(tl);
            if (renderLine) {
                const [p1, p2] = tl.points;
                const x1 = this.xFromIndex(p1.index);
                const y1 = this.yFromPrice(p1.price);
                const x2 = this.xFromIndex(p2.index);
                const y2 = this.yFromPrice(p2.price);
                const extendedDistance = this.distanceToSegment(px, py, renderLine.x1, renderLine.y1, renderLine.x2, renderLine.y2);
                const anchorDistance = this.distanceToSegment(px, py, x1, y1, x2, y2);
                const distance = Math.min(extendedDistance, anchorDistance);
                if (distance <= bodyTol) {
                    const d1 = Math.hypot(px - x1, py - y1);
                    const d2 = Math.hypot(px - x2, py - y2);
                    candidates.push({
                        type: 'trendline',
                        target: tl,
                        vertexIndex: d1 <= d2 ? 0 : 1,
                        distance,
                        draggable: true
                    });
                }
            }
        }

        for (let pl of this.drawings.polylines) {
            if (!pl.points || !pl.points.length) continue;
            pl.points.forEach((pt, idxVal) => {
                const x = this.xFromIndex(pt.index);
                const y = this.yFromPrice(pt.price);
                const distance = Math.hypot(px - x, py - y);
                if (distance <= vertexTol) {
                    candidates.push({
                        type: 'polyline',
                        target: pl,
                        vertexIndex: idxVal,
                        distance,
                        draggable: true
                    });
                }
            });

            for (let idxVal = 0; idxVal < pl.points.length - 1; idxVal++) {
                const x1 = this.xFromIndex(pl.points[idxVal].index);
                const y1 = this.yFromPrice(pl.points[idxVal].price);
                const x2 = this.xFromIndex(pl.points[idxVal + 1].index);
                const y2 = this.yFromPrice(pl.points[idxVal + 1].price);
                const distance = this.distanceToSegment(px, py, x1, y1, x2, y2);
                if (distance <= bodyTol) {
                    const d1 = Math.hypot(px - x1, py - y1);
                    const d2 = Math.hypot(px - x2, py - y2);
                    candidates.push({
                        type: 'polyline',
                        target: pl,
                        vertexIndex: d1 <= d2 ? idxVal : idxVal + 1,
                        distance,
                        draggable: true
                    });
                }
            }
        }

        return candidates;
    }

    parseBarDate(rawDate) {
        if (!rawDate) return null;
        const raw = String(rawDate);
        const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
        const dateObj = new Date(normalized);
        return Number.isNaN(dateObj.getTime()) ? null : dateObj;
    }

    formatBarTime(rawDate, period = this.chartPeriod) {
        const raw = rawDate ? String(rawDate) : '';
        const dateObj = this.parseBarDate(raw);
        if (!dateObj) {
            return {
                axisDate: raw,
                fullDate: raw,
                timestamp: null
            };
        }

        const pad = (num) => String(num).padStart(2, '0');
        const year = dateObj.getFullYear();
        const month = pad(dateObj.getMonth() + 1);
        const day = pad(dateObj.getDate());
        const hour = pad(dateObj.getHours());
        const minute = pad(dateObj.getMinutes());
        const hasTime = raw.includes(' ') || raw.includes('T');
        const intradayPeriods = new Set(['5M', '15M', '30M', '60M', '240M']);

        let axisDate = `${year}-${month}-${day}`;
        let fullDate = `${year}-${month}-${day}`;

        if (period === 'Month') {
            axisDate = `${year}-${month}`;
            fullDate = `${year}-${month}-${day}`;
        } else if (period === 'W') {
            axisDate = `${year}-${month}-${day}`;
            fullDate = `${year}-${month}-${day}`;
        } else if (intradayPeriods.has(period) || hasTime) {
            axisDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${hour}:${minute}`;
            fullDate = `${year}-${month}-${day} ${hour}:${minute}`;
        }

        return {
            axisDate,
            fullDate,
            timestamp: dateObj.getTime()
        };
    }

    setData(data) {
        // Record selected bar date before loading new data (only if symbol did not change)
        let selectedBarDate = null;
        if (this.symbol === this.lastSymbol && this.selectedBarIndex !== -1 && this.data && this.data[this.selectedBarIndex]) {
            selectedBarDate = this.data[this.selectedBarIndex].date || this.data[this.selectedBarIndex].datetime;
        }

        const sourceData = Array.isArray(data) ? data : [];
        const validData = sourceData.filter(d => {
            if (!d) return false;
            const rawDate = d.date || d.datetime;
            const open = parseFloat(d.open);
            const high = parseFloat(d.high);
            const low = parseFloat(d.low);
            const close = parseFloat(d.close);
            return rawDate && Number.isFinite(open) && Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(close);
        });

        this.data = validData.map((d, index, arr) => {
            const rawDate = d.date || d.datetime;
            const timeInfo = this.formatBarTime(rawDate);

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
                displayDate: timeInfo.axisDate,
                axisDate: timeInfo.axisDate,
                fullDate: timeInfo.fullDate,
                timestamp: timeInfo.timestamp,
                open: parseFloat(d.open),
                high: parseFloat(d.high),
                low: parseFloat(d.low),
                close: parseFloat(d.close),
                vwap: Number.isFinite(parseFloat(d.vwap)) ? parseFloat(d.vwap) : null,
                tdoiWap: Number.isFinite(parseFloat(d.tdoiWap)) ? parseFloat(d.tdoiWap) : null,
                volume: parseFloat(d.volume),
                hold: d.hold ? parseFloat(d.hold) : 0,
                ma5: getMA(5),
                ma10: getMA(10),
                ma20: getMA(20),
                ma40: getMA(40)
            };
        });
        
        this.hoverIndex = -1;
        
        // Restore selected K-line if possible
        let newSelectedIndex = -1;
        if (selectedBarDate && this.data) {
            // Exact match
            newSelectedIndex = this.data.findIndex(d => (d.date || d.datetime) === selectedBarDate);
            // Prefix match (for switching periods)
            if (newSelectedIndex === -1) {
                const selectedDateStr = String(selectedBarDate).split(' ')[0];
                newSelectedIndex = this.data.findIndex(d => {
                    const curDateStr = String(d.date || d.datetime).split(' ')[0];
                    return curDateStr === selectedDateStr;
                });
            }
        }
        
        this.selectedBarIndex = newSelectedIndex;
        if (this.selectedBarIndex === -1) {
            this.lastValidMouseX = -1;
            this.lastValidMouseY = -1;
        }
        this.selectedHLine = null;
        this.selectedTrendLine = null;
        this.selectedPolyline = null;
        this.selectedVertexIndex = null;
        this.activeTrendLine = null;
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
        
        this.lastSymbol = this.symbol;
        this.resize();
    }

    setProfileLevels(tpoLevel, vpLevel) {
        this.tpoLevel = tpoLevel || 'none';
        this.vpLevel = vpLevel || 'none';
    }

    setProfileDisplayMode(mode) {
        const allowed = new Set(['confluence', 'distribution', 'full']);
        this.profileDisplayMode = allowed.has(mode) ? mode : 'confluence';
        this.render();
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
            
            // Find target lookback dates for the requested endDate
            let targetDates = [];
            if (dailyDates && dailyDates.length > 0) {
                const endIdx = dailyDates.indexOf(endDate);
                if (endIdx !== -1) {
                    const startIdx = Math.max(0, endIdx - targetLookbackDays + 1);
                    targetDates = dailyDates.slice(startIdx, endIdx + 1);
                }
            }
            
            // Choose best available frequency dynamically based on coverage of targetDates
            let activeBars = null;
            let actualFrequencyUsed = null;
            let fallbackUsed = false;
            
            if (targetDates.length > 0) {
                let cov1m = 0;
                if (this.bars1m && this.bars1m.length > 0) {
                    const dates1m = new Set(this.bars1m.map(b => getTradingDate(b.datetime || b.date, dailyDates)));
                    targetDates.forEach(d => {
                        if (dates1m.has(d)) cov1m++;
                    });
                }
                
                let cov5m = 0;
                if (this.bars5m && this.bars5m.length > 0) {
                    const dates5m = new Set(this.bars5m.map(b => getTradingDate(b.datetime || b.date, dailyDates)));
                    targetDates.forEach(d => {
                        if (dates5m.has(d)) cov5m++;
                    });
                }
                
                if (cov1m > 0 || cov5m > 0) {
                    if (cov1m >= cov5m) {
                        activeBars = this.bars1m;
                        actualFrequencyUsed = '1m';
                        fallbackUsed = false;
                    } else {
                        activeBars = this.bars5m;
                        actualFrequencyUsed = '5m';
                        fallbackUsed = true;
                    }
                }
            }
            
            // Static fallback if targetDates is empty or no coverage was found
            if (!activeBars) {
                if (this.bars1m && this.bars1m.length > 0) {
                    activeBars = this.bars1m;
                    actualFrequencyUsed = '1m';
                    fallbackUsed = false;
                } else if (this.bars5m && this.bars5m.length > 0) {
                    activeBars = this.bars5m;
                    actualFrequencyUsed = '5m';
                    fallbackUsed = true;
                }
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
            
            // Count unique trading days <= endDate in the available bars
            const coveredDates = new Set(
                activeBars
                    .map(b => getTradingDate(b.datetime || b.date, dailyDates))
                    .filter(d => d <= endDate)
            );
            const actualLookbackDays = coveredDates.size;
            
            if (actualLookbackDays === 0) {
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
                        insufficientReason: 'No data available before or at ' + endDate
                    }
                };
                this.profileCache[cacheKey] = emptyProfile;
                return emptyProfile;
            }
            
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
        const levelLabel = meta.profileLevel === 'daily' ? 'Daily' :
                           meta.profileLevel === 'weekly' ? 'Weekly' : '30m';
        const quality = String(meta.dataQuality || 'full').toUpperCase();
        const freq = meta.actualFrequencyUsed
            ? `${meta.actualFrequencyUsed}${meta.fallbackUsed ? ' fallback' : ''}`
            : (type === 'tpo' ? '30m' : 'est.');
        const distToPoc = Number.isFinite(profile.poc) ? row.price - profile.poc : 0;
        const distText = `${distToPoc >= 0 ? '+' : ''}${distToPoc.toFixed(1)}`;
        const totalVol = meta.totalVolume || 1;

        let role = 'Outside VA';
        let roleColor = isDark ? '#cbd5e1' : '#475569';
        if (row.isPoc) {
            role = type === 'tpo' ? 'TPOC' : 'VPOC';
            roleColor = type === 'tpo' ? '#a855f7' : '#2563eb';
        } else if (row.isHvn) {
            role = 'HVN';
            roleColor = '#2563eb';
        } else if (row.isLvn) {
            role = 'LVN';
            roleColor = '#f43f5e';
        } else if (row.isSinglePrint) {
            role = 'Single';
            roleColor = '#f97316';
        } else if (row.isValueArea) {
            role = 'Value Area';
            roleColor = type === 'tpo' ? '#8b5cf6' : '#3b82f6';
        }

        const lines = type === 'tpo'
            ? [
                [`${levelLabel} TPO`, ''],
                ['Price', row.price.toFixed(1)],
                ['Time', `${row.value} TPO | ${role}`, roleColor],
                ['POC Dist', distText]
            ]
            : [
                [`${levelLabel} VP`, meta.actualFrequencyUsed || '1m'],
                ['Price', row.price.toFixed(1)],
                ['Est Vol', `${this.formatVolume(row.value)} | ${((row.value / totalVol) * 100).toFixed(2)}%`],
                ['POC Dist', `${role} | ${distText}`, roleColor]
            ];

        const tooltipW = 184;
        const tooltipH = 24 + lines.length * 17;
        let tooltipX = mouseX + 14;
        let tooltipY = mouseY + 14;
        if (tooltipX + tooltipW > w) tooltipX = mouseX - tooltipW - 14;
        if (tooltipY + tooltipH > h) tooltipY = mouseY - tooltipH - 14;
        tooltipX = Math.max(8, tooltipX);
        tooltipY = Math.max(8, tooltipY);

        ctx.save();
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.26)' : 'rgba(15, 23, 42, 0.16)';
        ctx.lineWidth = 1;
        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(15, 23, 42, 0.12)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 8);
        } else {
            ctx.rect(tooltipX, tooltipY, tooltipW, tooltipH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.textBaseline = 'top';
        lines.forEach((line, idx) => {
            const y = tooltipY + 10 + idx * 17;
            const [label, value, color] = line;
            ctx.fillStyle = idx === 0 ? (isDark ? '#e5e7eb' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b');
            ctx.font = idx === 0 ? 'bold 10px Inter' : '10px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(label, tooltipX + 10, y);
            ctx.fillStyle = color || (isDark ? '#f8fafc' : '#111827');
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(value, tooltipX + tooltipW - 10, y);
        });
        ctx.restore();
    }

    drawAggregatedProfileTooltip(rowTpo, rowVp, tpoProfile, vpProfile, mouseX, mouseY, w, h) {
        const ctx = this.ctx;
        const isDark = this.theme === 'dark';
        
        const metaTpo = tpoProfile.meta || {};
        const metaVp = vpProfile.meta || {};
        
        const levelLabelTpo = metaTpo.profileLevel === 'daily' ? '日' :
                             metaTpo.profileLevel === 'weekly' ? '周' : '30m';
        const levelLabelVp = metaVp.profileLevel === 'daily' ? '日' :
                            metaVp.profileLevel === 'weekly' ? '周' : '30m';
        
        let headerText = '';
        if (levelLabelTpo === levelLabelVp) {
            headerText = `${levelLabelTpo} TPO & VP`;
        } else {
            headerText = `${levelLabelTpo} TPO & ${levelLabelVp} VP`;
        }

        const distToPocTpo = Number.isFinite(tpoProfile.poc) ? rowTpo.price - tpoProfile.poc : 0;
        const distTextTpo = `${distToPocTpo >= 0 ? '+' : ''}${distToPocTpo.toFixed(1)}`;
        
        const distToPocVp = Number.isFinite(vpProfile.poc) ? rowVp.price - vpProfile.poc : 0;
        const distTextVp = `${distToPocVp >= 0 ? '+' : ''}${distToPocVp.toFixed(1)}`;
        
        const totalVolVp = metaVp.totalVolume || 1;

        // TPO Role
        let roleTpo = 'Outside VA';
        let roleColorTpo = isDark ? '#cbd5e1' : '#475569';
        if (rowTpo.isPoc) {
            roleTpo = 'TPOC';
            roleColorTpo = '#a855f7';
        } else if (rowTpo.isHvn) {
            roleTpo = 'HVN';
            roleColorTpo = '#2563eb';
        } else if (rowTpo.isLvn) {
            roleTpo = 'LVN';
            roleColorTpo = '#f43f5e';
        } else if (rowTpo.isSinglePrint) {
            roleTpo = 'Single';
            roleColorTpo = '#f97316';
        } else if (rowTpo.isValueArea) {
            roleTpo = 'Value Area';
            roleColorTpo = '#8b5cf6';
        }

        // VP Role
        let roleVp = 'Outside VA';
        let roleColorVp = isDark ? '#cbd5e1' : '#475569';
        if (rowVp.isPoc) {
            roleVp = 'VPOC';
            roleColorVp = '#2563eb';
        } else if (rowVp.isHvn) {
            roleVp = 'HVN';
            roleColorVp = '#2563eb';
        } else if (rowVp.isLvn) {
            roleVp = 'LVN';
            roleColorVp = '#f43f5e';
        } else if (rowVp.isSinglePrint) {
            roleVp = 'Single';
            roleColorVp = '#f97316';
        } else if (rowVp.isValueArea) {
            roleVp = 'Value Area';
            roleColorVp = '#3b82f6';
        }

        const lines = [
            [headerText, metaVp.actualFrequencyUsed || '1m'],
            ['Price', rowTpo.price.toFixed(1)],
            ['Est Vol', `${this.formatVolume(rowVp.value)} | ${((rowVp.value / totalVolVp) * 100).toFixed(2)}%`],
            ['Time', `${rowTpo.value} TPO | ${roleTpo}`, roleColorTpo],
            ['VP POC Dist', `${roleVp} | ${distTextVp}`, roleColorVp],
            ['TPO POC Dist', distTextTpo]
        ];

        const tooltipW = 194;
        const tooltipH = 24 + lines.length * 17;
        let tooltipX = mouseX + 14;
        let tooltipY = mouseY + 14;
        if (tooltipX + tooltipW > w) tooltipX = mouseX - tooltipW - 14;
        if (tooltipY + tooltipH > h) tooltipY = mouseY - tooltipH - 14;
        tooltipX = Math.max(8, tooltipX);
        tooltipY = Math.max(8, tooltipY);

        ctx.save();
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.26)' : 'rgba(15, 23, 42, 0.16)';
        ctx.lineWidth = 1;
        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(15, 23, 42, 0.12)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 8);
        } else {
            ctx.rect(tooltipX, tooltipY, tooltipW, tooltipH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.textBaseline = 'top';
        lines.forEach((line, idx) => {
            const y = tooltipY + 10 + idx * 17;
            const [label, value, color] = line;
            ctx.fillStyle = idx === 0 ? (isDark ? '#e5e7eb' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b');
            ctx.font = idx === 0 ? 'bold 10px Inter' : '10px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(label, tooltipX + 10, y);
            ctx.fillStyle = color || (isDark ? '#f8fafc' : '#111827');
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(value, tooltipX + tooltipW - 10, y);
        });
        ctx.restore();
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

    enterSimulatedFullscreen(chartPanel) {
        chartPanel.classList.add('mobile-fullscreen-simulated');
        document.body.classList.add('has-fullscreen-simulated');
        document.body.style.overflow = 'hidden';
        this.resize();
        setTimeout(() => this.resize(), 100);
    }

    cleanupFullscreen() {
        const chartPanel = this.canvas.closest('.chart-panel');
        if (chartPanel) {
            chartPanel.classList.remove('mobile-fullscreen-simulated');
        }
        document.body.classList.remove('has-fullscreen-simulated');
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
        
        this.resize();
        setTimeout(() => this.resize(), 100);
    }

    initEvents() {
        // Handle resizing
        window.addEventListener('resize', () => {
            this.resize();
            setTimeout(() => this.resize(), 100);
            setTimeout(() => this.resize(), 250);
        });

        // Click outside chart to clear selected bar (K-line lock)
        const clearSelectionHandler = (e) => {
            // Prevent error if clientX/Y are not accessible (e.g. touchstart touches empty)
            if (e.touches && (!e.touches[0] || e.touches[0].clientX === undefined)) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            // Right-click anywhere unlocks selection
            const isRightClick = !e.touches && e.button === 2;
            if (isRightClick) {
                if (this.selectedBarIndex !== -1) {
                    this.selectedBarIndex = -1;
                    this.lastValidMouseX = -1;
                    this.lastValidMouseY = -1;
                    this.render();
                }
                return;
            }

            if (e.target === this.canvas) {
                const coords = this.getEventCoords(clientX, clientY);
                const isInsideChartX = coords.x >= this.paddingLeft && coords.x <= this.logicalWidth - this.paddingRight;
                const { priceHeight } = this.getPriceHeightParams();
                const isInsideChartY = coords.y >= this.paddingTop && coords.y <= this.paddingTop + priceHeight;
                
                if (!(isInsideChartX && isInsideChartY)) {
                    if (this.selectedBarIndex !== -1) {
                        this.selectedBarIndex = -1;
                        this.lastValidMouseX = -1;
                        this.lastValidMouseY = -1;
                        this.render();
                    }
                }
            } else {
                // Clicking outside the canvas
                // Exclude clicks inside top toolbars (.chart-toolbar) and bottom navigation/drawing bar (.chart-navigation-bar)
                const isClickOnToolbar = e.target.closest('.chart-toolbar') || 
                                         e.target.closest('.chart-navigation-bar') ||
                                         e.target.closest('.scrollbar-container');
                
                if (!isClickOnToolbar) {
                    if (this.selectedBarIndex !== -1) {
                        this.selectedBarIndex = -1;
                        this.lastValidMouseX = -1;
                        this.lastValidMouseY = -1;
                        this.render();
                    }
                }
            }
        };
        document.addEventListener('mousedown', clearSelectionHandler);
        document.addEventListener('touchstart', clearSelectionHandler, { passive: true });

        // Prevent default context menu on the canvas to allow right-click K-line unlocking
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Mouse interactions for crosshair & panning & drawing
        this.canvas.addEventListener('mousemove', (e) => {
            const coords = this.getEventCoords(e.clientX, e.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            this.updateHoverIndex();
            
            const { priceHeight } = this.getPriceHeightParams();
            if (this.mouseX >= this.paddingLeft && this.mouseX <= this.logicalWidth - this.paddingRight &&
                this.mouseY >= this.paddingTop && this.mouseY <= this.paddingTop + priceHeight) {
                this.lastValidMouseX = this.mouseX;
                this.lastValidMouseY = this.mouseY;
            }
            
            const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
            if (chartWidth > 0 && this.mouseX >= this.paddingLeft && this.mouseX <= this.logicalWidth - this.paddingRight) {
                this.lastHoverPct = (this.mouseX - this.paddingLeft) / chartWidth;
            }
            
            // Dragging logic for drawings
            if (this.isDraggingDrawing) {
                const clampedPoint = this.clampDrawingPoint(this.mouseX, this.mouseY);
                if (this.selectedHLine) {
                    this.selectedHLine.price = clampedPoint.price;
                } else if (this.selectedTrendLine && this.selectedVertexIndex !== null) {
                    this.selectedTrendLine.points[this.selectedVertexIndex] = clampedPoint;
                } else if (this.selectedPolyline && this.selectedVertexIndex !== null) {
                    this.selectedPolyline.points[this.selectedVertexIndex] = clampedPoint;
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
            if (e.button !== 0) return; // Only process left click
            const coords = this.getEventCoords(e.clientX, e.clientY);
            const mouseX = coords.x;
            const mouseY = coords.y;

            // Click selection for K-lines
            const isInsideChartX = mouseX >= this.paddingLeft && mouseX <= this.logicalWidth - this.paddingRight;
            const { priceHeight } = this.getPriceHeightParams();
            const isInsideChartY = mouseY >= this.paddingTop && mouseY <= this.paddingTop + priceHeight;
            if (isInsideChartX && isInsideChartY && this.hoverIndex >= 0) {
                this.selectedBarIndex = this.selectedBarIndex === this.hoverIndex ? -1 : this.hoverIndex;
                if (this.selectedBarIndex === -1) {
                    this.lastValidMouseX = -1;
                    this.lastValidMouseY = -1;
                } else {
                    this.lastValidMouseX = mouseX;
                    this.lastValidMouseY = mouseY;
                }
                this.render();
            }

            if (this.drawingMode !== 'none') {
                let found = false;
                const { priceHeight } = this.getPriceHeightParams();
                const drawingHit = this.cycleDrawingHit(
                    this.getDrawingHitCandidates(mouseX, mouseY, { vertexTol: 14, bodyTol: 12 }),
                    mouseX,
                    mouseY
                );

                if (drawingHit) {
                    this.setSelectedDrawing(drawingHit);
                    if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();
                    this.render();
                    return;
                }

                // 1. Check if near horizontal lines
                const hline = this.findNearestHLine(mouseY, 12);
                if (hline) {
                    this.selectedHLine = hline;
                    this.selectedTrendLine = null;
                    this.selectedPolyline = null;
                    this.selectedVertexIndex = null;
                    this.isDraggingDrawing = true;
                    found = true;
                }

                // 2. Check if near trendline vertices
                if (!found) {
                    const tol = 14;
                    for (let tl of this.drawings.trendlines) {
                        for (let idxVal = 0; idxVal < tl.points.length; idxVal++) {
                            const pt = tl.points[idxVal];
                            const x = this.xFromIndex(pt.index);
                            const y = this.yFromPrice(pt.price);
                            if (Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2) < tol) {
                                this.selectedTrendLine = tl;
                                this.selectedVertexIndex = idxVal;
                                this.selectedHLine = null;
                                this.selectedPolyline = null;
                                this.isDraggingDrawing = true;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                // 3. Check if near trendline body
                if (!found) {
                    const trendlineHit = this.findNearestTrendLineHandle(mouseX, mouseY, 12);
                    if (trendlineHit) {
                        this.selectedTrendLine = trendlineHit.trendline;
                        this.selectedVertexIndex = trendlineHit.vertexIndex;
                        this.selectedHLine = null;
                        this.selectedPolyline = null;
                        this.isDraggingDrawing = true;
                        found = true;
                    }
                }

                // 4. Check if near polyline vertices
                if (!found) {
                    const tol = 14;
                    for (let pl of this.drawings.polylines) {
                        for (let idxVal = 0; idxVal < pl.points.length; idxVal++) {
                            const pt = pl.points[idxVal];
                            const x = this.xFromIndex(pt.index);
                            const y = this.yFromPrice(pt.price);
                            if (Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2) < tol) {
                                this.selectedPolyline = pl;
                                this.selectedVertexIndex = idxVal;
                                this.selectedHLine = null;
                                this.selectedTrendLine = null;
                                this.isDraggingDrawing = true;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                // 5. Check if near polyline segments (distance from point to line segment)
                if (!found) {
                    const segmentHit = this.findNearestPolylineSegment(mouseX, mouseY, 12);
                    if (segmentHit) {
                        this.selectedPolyline = segmentHit.polyline;
                        this.selectedVertexIndex = segmentHit.vertexIndex;
                        this.selectedHLine = null;
                        this.selectedTrendLine = null;
                        this.isDraggingDrawing = true;
                        found = true;
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
                        this.selectedTrendLine = null;
                        this.selectedPolyline = null;
                        this.isDraggingDrawing = true;
                    } else if (this.drawingMode === 'trendline') {
                        if (!this.activeTrendLine) {
                            const newTrend = { points: [{ index: currentIndex, price: currentPrice }] };
                            this.drawings.trendlines.push(newTrend);
                            this.activeTrendLine = newTrend;
                            this.selectedTrendLine = newTrend;
                            this.selectedHLine = null;
                            this.selectedPolyline = null;
                        } else {
                            this.activeTrendLine.points.push({ index: currentIndex, price: currentPrice });
                            this.selectedTrendLine = this.activeTrendLine;
                            this.selectedHLine = null;
                            this.selectedPolyline = null;
                            this.selectedVertexIndex = null;
                            this.activeTrendLine = null;
                        }
                    } else if (this.drawingMode === 'polyline') {
                        if (!this.activePolyline) {
                            const newPoly = { points: [{ index: currentIndex, price: currentPrice }] };
                            this.drawings.polylines.push(newPoly);
                            this.activePolyline = newPoly;
                            this.selectedPolyline = newPoly;
                            this.selectedHLine = null;
                            this.selectedTrendLine = null;
                        } else {
                            this.activePolyline.points.push({ index: currentIndex, price: currentPrice });
                            this.selectedPolyline = this.activePolyline;
                            this.selectedHLine = null;
                            this.selectedTrendLine = null;
                        }
                    }
                    this.saveDrawings();
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
            if (this.isDraggingDrawing) this.saveDrawings();
            this.isPanning = false;
            this.isDraggingScrollbar = false;
            this.isDraggingDrawing = false;
        });

        window.addEventListener('touchend', () => {
            if (this.isDraggingDrawing) this.saveDrawings();
            this.isPanning = false;
            this.isDraggingScrollbar = false;
            this.isDraggingDrawing = false;
        });

        // Centered Wheel Zooming
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.data.length) return;
            e.preventDefault();
            
            const coords = this.getEventCoords(e.clientX, e.clientY);
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
            const coords = this.getEventCoords(e.touches[0].clientX, e.touches[0].clientY);
            const touchX = coords.x;
            const touchY = coords.y;
            
            // Click selection for K-lines on touch screens
            const isInsideChartX = touchX >= this.paddingLeft && touchX <= this.logicalWidth - this.paddingRight;
            const { priceHeight } = this.getPriceHeightParams();
            const isInsideChartY = touchY >= this.paddingTop && touchY <= this.paddingTop + priceHeight;
            if (isInsideChartX && isInsideChartY) {
                const chartWidth = this.logicalWidth - this.paddingLeft - this.paddingRight;
                const visibleCount = this.visibleEnd - this.visibleStart;
                const candleWidth = chartWidth / visibleCount;
                const relativeX = touchX - this.paddingLeft;
                const offsetIndex = Math.floor(relativeX / candleWidth);
                const index = this.visibleStart + offsetIndex;
                if (index >= this.visibleStart && index < this.visibleEnd && index < this.data.length) {
                    this.selectedBarIndex = this.selectedBarIndex === index ? -1 : index;
                    this.hoverIndex = index;
                    if (this.selectedBarIndex !== -1) {
                        this.lastValidMouseX = touchX;
                        this.lastValidMouseY = touchY;
                    } else {
                        this.lastValidMouseX = -1;
                        this.lastValidMouseY = -1;
                    }
                    this.render();
                }
            }
            
            if (this.drawingMode !== 'none') {
                e.preventDefault();
                let found = false;
                const { priceHeight } = this.getPriceHeightParams();
                const drawingHit = this.cycleDrawingHit(
                    this.getDrawingHitCandidates(touchX, touchY, { vertexTol: 24, bodyTol: 12 }),
                    touchX,
                    touchY
                );

                if (drawingHit) {
                    this.setSelectedDrawing(drawingHit);
                    if (this.updateDrawingBtnStates) this.updateDrawingBtnStates();
                    this.render();
                    return;
                }

                // 1. Check if near horizontal lines
                const hline = this.findNearestHLine(touchY, 12);
                if (hline) {
                    this.selectedHLine = hline;
                    this.selectedTrendLine = null;
                    this.selectedPolyline = null;
                    this.selectedVertexIndex = null;
                    this.isDraggingDrawing = true;
                    found = true;
                }

                // 2. Check if near trendline vertices
                if (!found) {
                    const tol = 24;
                    for (let tl of this.drawings.trendlines) {
                        for (let idxVal = 0; idxVal < tl.points.length; idxVal++) {
                            const pt = tl.points[idxVal];
                            const x = this.xFromIndex(pt.index);
                            const y = this.yFromPrice(pt.price);
                            if (Math.sqrt((touchX - x) ** 2 + (touchY - y) ** 2) < tol) {
                                this.selectedTrendLine = tl;
                                this.selectedVertexIndex = idxVal;
                                this.selectedHLine = null;
                                this.selectedPolyline = null;
                                this.isDraggingDrawing = true;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                // 3. Check if near trendline body
                if (!found) {
                    const trendlineHit = this.findNearestTrendLineHandle(touchX, touchY, 12);
                    if (trendlineHit) {
                        this.selectedTrendLine = trendlineHit.trendline;
                        this.selectedVertexIndex = trendlineHit.vertexIndex;
                        this.selectedHLine = null;
                        this.selectedPolyline = null;
                        this.isDraggingDrawing = true;
                        found = true;
                    }
                }

                // 4. Check if near polyline vertices
                if (!found) {
                    const tol = 24;
                    for (let pl of this.drawings.polylines) {
                        for (let idxVal = 0; idxVal < pl.points.length; idxVal++) {
                            const pt = pl.points[idxVal];
                            const x = this.xFromIndex(pt.index);
                            const y = this.yFromPrice(pt.price);
                            if (Math.sqrt((touchX - x) ** 2 + (touchY - y) ** 2) < tol) {
                                this.selectedPolyline = pl;
                                this.selectedVertexIndex = idxVal;
                                this.selectedHLine = null;
                                this.selectedTrendLine = null;
                                this.isDraggingDrawing = true;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                }

                // 5. Check if near polyline segments
                if (!found) {
                    const segmentHit = this.findNearestPolylineSegment(touchX, touchY, 12);
                    if (segmentHit) {
                        this.selectedPolyline = segmentHit.polyline;
                        this.selectedVertexIndex = segmentHit.vertexIndex;
                        this.selectedHLine = null;
                        this.selectedTrendLine = null;
                        this.isDraggingDrawing = true;
                        found = true;
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
                        this.selectedTrendLine = null;
                        this.selectedPolyline = null;
                        this.isDraggingDrawing = true;
                    } else if (this.drawingMode === 'trendline') {
                        if (!this.activeTrendLine) {
                            const newTrend = { points: [{ index: currentIndex, price: currentPrice }] };
                            this.drawings.trendlines.push(newTrend);
                            this.activeTrendLine = newTrend;
                            this.selectedTrendLine = newTrend;
                            this.selectedHLine = null;
                            this.selectedPolyline = null;
                        } else {
                            this.activeTrendLine.points.push({ index: currentIndex, price: currentPrice });
                            this.selectedTrendLine = this.activeTrendLine;
                            this.selectedHLine = null;
                            this.selectedPolyline = null;
                            this.selectedVertexIndex = null;
                            this.activeTrendLine = null;
                        }
                    } else if (this.drawingMode === 'polyline') {
                        if (!this.activePolyline) {
                            const newPoly = { points: [{ index: currentIndex, price: currentPrice }] };
                            this.drawings.polylines.push(newPoly);
                            this.activePolyline = newPoly;
                            this.selectedPolyline = newPoly;
                            this.selectedHLine = null;
                            this.selectedTrendLine = null;
                        } else {
                            this.activePolyline.points.push({ index: currentIndex, price: currentPrice });
                            this.selectedPolyline = this.activePolyline;
                            this.selectedHLine = null;
                            this.selectedTrendLine = null;
                        }
                    }
                    this.saveDrawings();
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
                
                const midClientX = (t1.clientX + t2.clientX) / 2;
                const midClientY = (t1.clientY + t2.clientY) / 2;
                const midCoords = this.getEventCoords(midClientX, midClientY);
                const midX = midCoords.x;
                
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
                const coords = this.getEventCoords(e.touches[0].clientX, e.touches[0].clientY);
                const touchX = coords.x;
                const touchY = coords.y;
                const clampedPoint = this.clampDrawingPoint(touchX, touchY);

                if (this.selectedHLine) {
                    this.selectedHLine.price = clampedPoint.price;
                } else if (this.selectedTrendLine && this.selectedVertexIndex !== null) {
                    this.selectedTrendLine.points[this.selectedVertexIndex] = clampedPoint;
                } else if (this.selectedPolyline && this.selectedVertexIndex !== null) {
                    this.selectedPolyline.points[this.selectedVertexIndex] = clampedPoint;
                }
            } else if (this.isTouchPanning && e.touches.length === 1) {
                const coords = this.getEventCoords(e.touches[0].clientX, e.touches[0].clientY);
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
            if (window.innerWidth < 768) {
                const mobileCount = Math.min(this.data.length, 45);
                this.visibleStart = this.data.length - mobileCount;
                this.visibleEnd = this.data.length;
            } else {
                this.visibleStart = 0;
                this.visibleEnd = this.data.length;
            }
            this.render();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectedBarIndex !== -1) {
                this.selectedBarIndex = -1;
                this.lastValidMouseX = -1;
                this.lastValidMouseY = -1;
                this.render();
            }
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
                    setTimeout(() => this.resize(), 100);
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
        const drawTrendLineBtn = document.getElementById('drawTrendLineBtn');
        const drawPolylineBtn = document.getElementById('drawPolylineBtn');
        const finishPolylineBtn = document.getElementById('finishPolylineBtn');
        const deleteDrawingBtn = document.getElementById('deleteDrawingBtn');

        const discardActiveTrendLine = () => {
            let removed = false;
            if (this.activeTrendLine && this.activeTrendLine.points && this.activeTrendLine.points.length < 2) {
                const idx = this.drawings.trendlines.indexOf(this.activeTrendLine);
                if (idx > -1) {
                    this.drawings.trendlines.splice(idx, 1);
                    removed = true;
                }
            }
            this.activeTrendLine = null;
            if (removed) this.saveDrawings();
        };

        const updateBtnStates = () => {
            if (drawHLineBtn) {
                if (this.drawingMode === 'hline') {
                    drawHLineBtn.classList.add('active');
                } else {
                    drawHLineBtn.classList.remove('active');
                }
            }
            if (drawTrendLineBtn) {
                if (this.drawingMode === 'trendline') {
                    drawTrendLineBtn.classList.add('active');
                } else {
                    drawTrendLineBtn.classList.remove('active');
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
                if (this.selectedHLine !== null || this.selectedTrendLine !== null || this.selectedPolyline !== null) {
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
                    discardActiveTrendLine();
                }
                this.selectedHLine = null;
                this.selectedTrendLine = null;
                this.selectedPolyline = null;
                this.selectedVertexIndex = null;
                updateBtnStates();
                this.render();
            });
        }

        if (drawTrendLineBtn) {
            drawTrendLineBtn.addEventListener('click', () => {
                if (this.drawingMode === 'trendline') {
                    this.drawingMode = 'none';
                    discardActiveTrendLine();
                } else {
                    this.drawingMode = 'trendline';
                    this.activePolyline = null;
                }
                this.selectedHLine = null;
                this.selectedTrendLine = null;
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
                    discardActiveTrendLine();
                }
                this.selectedHLine = null;
                this.selectedTrendLine = null;
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
                this.selectedTrendLine = null;
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
                } else if (this.selectedTrendLine) {
                    const idx = this.drawings.trendlines.indexOf(this.selectedTrendLine);
                    if (idx > -1) this.drawings.trendlines.splice(idx, 1);
                    this.selectedTrendLine = null;
                    this.selectedVertexIndex = null;
                    this.activeTrendLine = null;
                } else if (this.selectedPolyline) {
                    const idx = this.drawings.polylines.indexOf(this.selectedPolyline);
                    if (idx > -1) this.drawings.polylines.splice(idx, 1);
                    this.selectedPolyline = null;
                    this.selectedVertexIndex = null;
                    this.activePolyline = null;
                }
                this.saveDrawings();
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
                const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
                const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
                const isRotated = isSimulatedFS && isPortrait;

                const clickX = isRotated ? e.clientY - rect.top : e.clientX - rect.left;
                const trackWidth = isRotated ? rect.height : rect.width;
                const pct = clickX / trackWidth;

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
                const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
                const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
                const isRotated = isSimulatedFS && isPortrait;
                this.dragStartMouseX = isRotated ? e.clientY : e.clientX;
                this.dragStartHandleLeft = handle.offsetLeft;
                e.stopPropagation();
            });

            handle.addEventListener('touchstart', (e) => {
                this.isDraggingScrollbar = true;
                const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
                const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
                const isRotated = isSimulatedFS && isPortrait;
                this.dragStartMouseX = isRotated ? e.touches[0].clientY : e.touches[0].clientX;
                this.dragStartHandleLeft = handle.offsetLeft;
                e.stopPropagation();
            }, { passive: true });

            // Handle dragging globally
            window.addEventListener('mousemove', (e) => {
                if (!this.isDraggingScrollbar || !this.data.length) return;

                const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
                const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
                const isRotated = isSimulatedFS && isPortrait;

                const trackRect = track.getBoundingClientRect();
                const handleRect = handle.getBoundingClientRect();
                const trackWidth = isRotated ? trackRect.height : trackRect.width;
                const handleWidth = isRotated ? handleRect.height : handleRect.width;
                const maxLeft = trackWidth - handleWidth;
                if (maxLeft <= 0) return;

                const dx = (isRotated ? e.clientY : e.clientX) - this.dragStartMouseX;
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

                const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
                const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
                const isRotated = isSimulatedFS && isPortrait;

                const trackRect = track.getBoundingClientRect();
                const handleRect = handle.getBoundingClientRect();
                const trackWidth = isRotated ? trackRect.height : trackRect.width;
                const handleWidth = isRotated ? handleRect.height : handleRect.width;
                const maxLeft = trackWidth - handleWidth;
                if (maxLeft <= 0) return;

                const dx = (isRotated ? e.touches[0].clientY : e.touches[0].clientX) - this.dragStartMouseX;
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
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Save raw layout dimensions in logical pixels
        this.logicalWidth = width;
        this.logicalHeight = height;
        
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

        // Reserve side gutters for compact profile level tags. This keeps labels out of candles.
        const hasTpoProfile = this.tpoLevel !== 'none';
        const hasVpProfile = this.vpLevel !== 'none';
        this.paddingLeft = Math.max(this.chartType === 'line' ? 55 : 15, hasTpoProfile ? 88 : 0);
        this.paddingRight = hasVpProfile ? 136 : 65;

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
            if (this.chartType === 'line') {
                if (Number.isFinite(d.vwap)) {
                    if (d.vwap > maxPrice) maxPrice = d.vwap;
                    if (d.vwap < minPrice) minPrice = d.vwap;
                }
                if (Number.isFinite(d.tdoiWap)) {
                    if (d.tdoiWap > maxPrice) maxPrice = d.tdoiWap;
                    if (d.tdoiWap < minPrice) minPrice = d.tdoiWap;
                }
            }
            if (d.volume > maxVol) maxVol = d.volume;
        });

        // Add 5% padding to top and bottom of price chart
        const priceRange = maxPrice - minPrice;
        if (!Number.isFinite(priceRange) || priceRange === 0) {
            const padding = Math.max(Math.abs(maxPrice) * 0.01, 1);
            maxPrice += padding;
            minPrice -= padding;
        } else {
            maxPrice += priceRange * 0.05;
            minPrice -= priceRange * 0.05;
        }
        if (minPrice < 0) minPrice = 0;

        // Calculate TPO and Volume Profiles if requested
        const lastVisibleBar = visibleData[visibleData.length - 1];
        
        let targetBar = null;
        if (this.selectedBarIndex >= 0 && this.selectedBarIndex < this.data.length) {
            targetBar = this.data[this.selectedBarIndex];
        } else if (this.hoverIndex >= 0 && this.hoverIndex < this.data.length) {
            targetBar = this.data[this.hoverIndex];
        } else {
            targetBar = lastVisibleBar;
        }

        let tpoProfile = null;
        let tpoStep = 0;
        let endDate = null;
        if (this.tpoLevel !== 'none' && targetBar) {
            endDate = targetBar.date || (targetBar.datetime ? getTradingDate(targetBar.datetime, this.dailyDates) : null);
            if (endDate) {
                tpoProfile = this.getProfileData('tpo', this.tpoLevel, endDate);
                if (tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 1) {
                    tpoStep = tpoProfile.rows[1].price - tpoProfile.rows[0].price;
                }
            }
        }

        let vpProfile = null;
        let vpStep = 0;
        if (this.vpLevel !== 'none' && targetBar) {
            if (!endDate) {
                endDate = targetBar.date || (targetBar.datetime ? getTradingDate(targetBar.datetime, this.dailyDates) : null);
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
            ctx.textAlign = 'left';
            ctx.fillText(priceVal.toFixed(1), w - this.paddingRight + 6, y);

            // Left Y-axis percentage labels in line mode (relative to latest day's prevClose)
            if (this.chartType === 'line' && visibleData.length > 0) {
                let latestPrevClose = null;
                for (let j = visibleData.length - 1; j >= 0; j--) {
                    if (visibleData[j] && Number.isFinite(visibleData[j].prevClose)) {
                        latestPrevClose = visibleData[j].prevClose;
                        break;
                    }
                }

                if (latestPrevClose > 0) {
                    const changePct = ((priceVal - latestPrevClose) / latestPrevClose) * 100;
                    const sign = changePct > 0 ? '+' : '';
                    const pctLabel = `${sign}${changePct.toFixed(2)}%`;
                    ctx.fillStyle = changePct > 0 ? colorUp : (changePct < 0 ? colorDown : colorText);
                    ctx.textAlign = 'right';
                    ctx.fillText(pctLabel, this.paddingLeft - 6, y);
                }
            }
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

        const profileMode = this.profileDisplayMode || 'confluence';
        const showProfileBars = profileMode === 'distribution' || profileMode === 'full';
        const showFullProfileDetail = profileMode === 'full';
        const maxProfileWidth = chartWidth * (profileMode === 'full' ? 0.22 : 0.16);
        const profileHitWidth = Math.max(maxProfileWidth, 72);
        const levelTags = [];
        const plotLeft = this.paddingLeft;
        const plotRight = w - this.paddingRight;
        const priceTop = this.paddingTop;
        const priceBottom = this.paddingTop + priceHeight;
        const isYInPricePane = (y) => y >= priceTop && y <= priceBottom;

        const strokeProfileLevel = (price, color, width = 1, dash = []) => {
            const y = getPriceY(price);
            if (!isYInPricePane(y)) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.setLineDash(dash);
            ctx.beginPath();
            ctx.moveTo(plotLeft, y);
            ctx.lineTo(plotRight, y);
            ctx.stroke();
            ctx.restore();
        };

        const addLevelTag = (side, label, price, color) => {
            const y = getPriceY(price);
            if (!isYInPricePane(y)) return;
            levelTags.push({ side, label, price, y, color });
        };

        const drawLevelTags = () => {
            // Priority for pruning when tags overflow vertical space:
            // 4=POC, 3=VA bounds, 2=HVN, 1=LVN/LOW
            const TAG_PRIORITY = { 'TPOC': 4, 'VPOC': 4, 'VPOC*': 4, 'TVH': 3, 'TVL': 3, 'VVH': 3, 'VVL': 3, 'HVN': 2, 'LVN': 1, 'LOW': 1 };
            const getTagPriority = (label) => TAG_PRIORITY[label] ?? 2;

            const placeTags = (side) => {
                const gapY = 14;
                const topLimit = priceTop + 8;
                const bottomLimit = priceBottom - 8;
                const availableHeight = bottomLimit - topLimit;
                const maxFit = Math.floor(availableHeight / gapY);

                let tags = levelTags
                    .filter(tag => tag.side === side)
                    .sort((a, b) => a.y - b.y);

                // Prune lowest-priority tags if we have too many to fit
                if (tags.length > maxFit) {
                    // Sort by priority ascending so we drop low-priority first
                    const sorted = [...tags].sort((a, b) => getTagPriority(a.label) - getTagPriority(b.label));
                    const toDrop = new Set(sorted.slice(0, tags.length - maxFit).map(t => t));
                    tags = tags.filter(t => !toDrop.has(t));
                }

                const placed = tags.map(tag => ({
                    ...tag,
                    placedY: Math.min(bottomLimit, Math.max(topLimit, tag.y))
                }));

                for (let i = 1; i < placed.length; i++) {
                    placed[i].placedY = Math.max(placed[i].placedY, placed[i - 1].placedY + gapY);
                }

                const overflow = placed.length ? placed[placed.length - 1].placedY - bottomLimit : 0;
                if (overflow > 0) {
                    placed.forEach(tag => {
                        tag.placedY = Math.max(topLimit, tag.placedY - overflow);
                    });
                }

                for (let i = 1; i < placed.length; i++) {
                    placed[i].placedY = Math.max(placed[i].placedY, placed[i - 1].placedY + gapY);
                }

                return placed.map(tag => {
                    tag.placedY = Math.min(bottomLimit, Math.max(topLimit, tag.placedY));
                    return tag;
                });
            };

            ctx.save();
            ctx.font = 'bold 8px Inter';
            ctx.textBaseline = 'middle';
            ['left', 'right'].forEach(side => {
                placeTags(side).forEach(tag => {
                    const tagW = side === 'left' ? this.paddingLeft - 12 : 78;
                    const tagH = 13;
                    const x = side === 'left' ? 4 : w - tagW - 4;
                    const y = tag.placedY - tagH / 2;
                    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(248, 250, 252, 0.9)';
                    ctx.strokeStyle = tag.color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(x, y, tagW, tagH, 4);
                    } else {
                        ctx.rect(x, y, tagW, tagH);
                    }
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = tag.color;
                    ctx.textAlign = 'center';
                    ctx.fillText(`${tag.label} ${tag.price.toFixed(1)}`, x + tagW / 2, tag.placedY);
                });
            });
            ctx.restore();
        };

        if (tpoProfile && vpProfile && tpoProfile.rows?.length && vpProfile.rows?.length) {
            const overlapLow = Math.max(tpoProfile.val, vpProfile.val);
            const overlapHigh = Math.min(tpoProfile.vah, vpProfile.vah);
            if (overlapLow <= overlapHigh) {
                const yHigh = getPriceY(overlapHigh);
                const yLow = getPriceY(overlapLow);
                ctx.save();
                ctx.fillStyle = isDark ? 'rgba(14, 165, 233, 0.10)' : 'rgba(14, 165, 233, 0.08)';
                ctx.fillRect(plotLeft, yHigh, plotRight - plotLeft, Math.max(1, yLow - yHigh));
                ctx.restore();
            }
        }

        if (showProfileBars && tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 0) {
            const vaFillStyle = isDark ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.16)';
            const nonVaFillStyle = isDark ? 'rgba(139, 92, 246, 0.07)' : 'rgba(139, 92, 246, 0.05)';
            
            tpoProfile.rows.forEach(row => {
                const yBottom = getPriceY(row.price - tpoStep / 2);
                const yTop = getPriceY(row.price + tpoStep / 2);
                const barHeight = Math.max(1, yBottom - yTop);
                
                if (yTop >= priceTop - barHeight && yBottom <= priceBottom + barHeight) {
                    const barWidth = row.normalizedValue * maxProfileWidth;
                    ctx.fillStyle = row.isValueArea ? vaFillStyle : nonVaFillStyle;
                    ctx.fillRect(plotLeft, yTop, barWidth, barHeight);
                }
            });
        }

        if (showProfileBars && vpProfile && vpProfile.rows && vpProfile.rows.length > 0) {
            const vaFillStyle = isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.16)';
            const nonVaFillStyle = isDark ? 'rgba(59, 130, 246, 0.07)' : 'rgba(59, 130, 246, 0.05)';
            
            vpProfile.rows.forEach(row => {
                const yBottom = getPriceY(row.price - vpStep / 2);
                const yTop = getPriceY(row.price + vpStep / 2);
                const barHeight = Math.max(1, yBottom - yTop);
                
                if (yTop >= priceTop - barHeight && yBottom <= priceBottom + barHeight) {
                    const barWidth = row.normalizedValue * maxProfileWidth;
                    ctx.fillStyle = row.isValueArea ? vaFillStyle : nonVaFillStyle;
                    ctx.fillRect(plotRight - barWidth, yTop, barWidth, barHeight);
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
            // Draw vertical day separators (LOD Date Boundary Visual Separators)
            ctx.save();
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            visibleData.forEach((d, i) => {
                if (i > 0 && d.tradingDay !== visibleData[i - 1].tradingDay) {
                    const xBoundary = this.paddingLeft + (i * candleWidth);
                    ctx.beginPath();
                    ctx.moveTo(xBoundary, this.paddingTop);
                    ctx.lineTo(xBoundary, this.paddingTop + priceHeight);
                    ctx.stroke();
                }
            });
            ctx.restore();



            // Traditional intraday chart: close line + cumulative VWAP line.
            const closeLineColor = isDark ? '#f9fafb' : '#64748b';
            const vwapLineColor = '#eab308';
            const drawLineSeries = (key, color, lineWidth) => {
                ctx.beginPath();
                let started = false;
                visibleData.forEach((d, i) => {
                    const value = Number(d[key]);
                    if (!Number.isFinite(value)) return;
                    const x = this.paddingLeft + (i * candleWidth) + (candleWidth / 2);
                    const y = getPriceY(value);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                if (started) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                }
            };

            drawLineSeries('close', closeLineColor, 1.35);
            drawLineSeries('vwap', vwapLineColor, 1.45);
            drawLineSeries('tdoiWap', '#0d9488', 1.45);

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
            if (this.indicators.ma40) drawMA('ma40', '#14b8a6'); // Teal
        }

        if (tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 0) {
            strokeProfileLevel(tpoProfile.poc, '#a855f7', 1.4);
            strokeProfileLevel(tpoProfile.vah, 'rgba(168, 85, 247, 0.46)', 1, [4, 4]);
            strokeProfileLevel(tpoProfile.val, 'rgba(168, 85, 247, 0.46)', 1, [4, 4]);
            addLevelTag('left', 'TPOC', tpoProfile.poc, '#a855f7');
            addLevelTag('left', 'TVH', tpoProfile.vah, '#8b5cf6');
            addLevelTag('left', 'TVL', tpoProfile.val, '#8b5cf6');
        }

        if (vpProfile && vpProfile.rows && vpProfile.rows.length > 0) {
            strokeProfileLevel(vpProfile.poc, '#2563eb', 1.4);
            strokeProfileLevel(vpProfile.vah, 'rgba(37, 99, 235, 0.46)', 1, [4, 4]);
            strokeProfileLevel(vpProfile.val, 'rgba(37, 99, 235, 0.46)', 1, [4, 4]);
            addLevelTag('right', vpProfile.meta?.isEstimated ? 'VPOC*' : 'VPOC', vpProfile.poc, '#2563eb');
            addLevelTag('right', 'VVH', vpProfile.vah, '#3b82f6');
            addLevelTag('right', 'VVL', vpProfile.val, '#3b82f6');

            const vpSignalSpan = showFullProfileDetail ? (plotRight - maxProfileWidth) : plotRight;
            if (showFullProfileDetail && vpProfile.meta && vpProfile.meta.hvnList) {
                vpProfile.meta.hvnList.forEach(hvn => {
                    const y = getPriceY(hvn);
                    if (!isYInPricePane(y)) return;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(37, 99, 235, 0.26)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(vpSignalSpan, y);
                    ctx.lineTo(plotRight, y);
                    ctx.stroke();
                    ctx.restore();
                    addLevelTag('right', 'HVN', hvn, '#3b82f6');
                });
            }

            if (vpProfile.meta && vpProfile.meta.lvnList) {
                const tpoSingles = tpoProfile?.rows?.filter(row => row.isSinglePrint).map(row => row.price) || [];
                const lowAcceptanceTolerance = Math.max(Math.abs(tpoStep || 0), Math.abs(vpStep || 0), 1) * 1.25;
                vpProfile.meta.lvnList.forEach(lvn => {
                    const hasTpoLowAcceptance = tpoSingles.some(price => Math.abs(price - lvn) <= lowAcceptanceTolerance);
                    if (!showFullProfileDetail && !hasTpoLowAcceptance) return;
                    const y = getPriceY(lvn);
                    if (!isYInPricePane(y)) return;
                    ctx.save();
                    ctx.strokeStyle = hasTpoLowAcceptance ? 'rgba(249, 115, 22, 0.62)' : 'rgba(244, 63, 94, 0.32)';
                    ctx.lineWidth = hasTpoLowAcceptance ? 1.2 : 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(hasTpoLowAcceptance ? plotLeft : vpSignalSpan, y);
                    ctx.lineTo(plotRight, y);
                    ctx.stroke();
                    ctx.restore();
                    addLevelTag('right', hasTpoLowAcceptance ? 'LOW' : 'LVN', lvn, hasTpoLowAcceptance ? '#f97316' : '#f43f5e');
                });
            }
        }

        drawLevelTags();

        if (this.selectedBarIndex >= this.visibleStart && this.selectedBarIndex < this.visibleEnd) {
            const lockX = this.paddingLeft + ((this.selectedBarIndex - this.visibleStart) * candleWidth) + (candleWidth / 2);
            ctx.save();
            ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(15, 23, 42, 0.24)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(lockX, this.paddingTop);
            ctx.lineTo(lockX, this.paddingTop + priceHeight);
            ctx.stroke();
            ctx.restore();
        }

        // 4. X-Axis Date Labels (draw about 5 labels depending on count)
        const labelInterval = Math.ceil(count / 5);
        ctx.fillStyle = colorText;
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const leftLimit = this.paddingLeft + 4;
        const rightLimit = w - this.paddingRight - 8;
        const lastLabel = visibleData[count - 1]?.axisDate || visibleData[count - 1]?.displayDate || '';
        const lastLabelLeft = Math.max(leftLimit, rightLimit - ctx.measureText(lastLabel).width);
        let lastDrawnLabelRight = -Infinity;
        visibleData.forEach((d, i) => {
            if (i % labelInterval === 0 || i === count - 1) {
                const x = this.paddingLeft + (i * candleWidth) + (candleWidth / 2);
                const label = d.axisDate || d.displayDate || '';
                const labelWidth = ctx.measureText(label).width;
                if (i !== count - 1) {
                    const rawLeft = x - labelWidth / 2;
                    const rawRight = x + labelWidth / 2;
                    if (rawRight > lastLabelLeft - 8 || rawLeft < lastDrawnLabelRight + 8) {
                        return;
                    }
                }

                ctx.beginPath();
                ctx.strokeStyle = colorGrid;
                ctx.moveTo(x, this.paddingTop);
                ctx.lineTo(x, this.paddingTop + priceHeight);
                ctx.stroke();
                
                // Print date text
                ctx.fillStyle = colorText;
                let labelX = x;
                let labelAlign = 'center';
                let labelLeft = labelX - labelWidth / 2;
                let labelRight = labelX + labelWidth / 2;
                if (labelX + labelWidth / 2 > rightLimit) {
                    labelX = rightLimit;
                    labelAlign = 'right';
                    labelLeft = labelX - labelWidth;
                    labelRight = labelX;
                } else if (labelX - labelWidth / 2 < leftLimit) {
                    labelX = leftLimit;
                    labelAlign = 'left';
                    labelLeft = labelX;
                    labelRight = labelX + labelWidth;
                }
                ctx.textAlign = labelAlign;
                ctx.fillText(label, labelX, this.paddingTop + priceHeight + 6);
                lastDrawnLabelRight = labelRight;
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
                const labelW = 60;
                const labelH = 14;
                ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(203, 213, 225, 0.75)';
                ctx.fillRect(w - this.paddingRight + 1, this.mouseY - labelH / 2, labelW, labelH);
                ctx.fillStyle = colorTextBright;
                ctx.font = '10px Inter';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(hoverPrice.toFixed(1), w - this.paddingRight + 6, this.mouseY);
            }
            
            ctx.setLineDash([]); // Reset line dash

            // Draw K-line details banner inside the top-left area of the canvas
            ctx.font = '10px Inter, sans-serif';
            const prevBar = this.hoverIndex > 0 ? this.data[this.hoverIndex - 1] : null;
            const refPrice = prevBar ? prevBar.close : d.open;
            
            const isLineMode = this.chartType === 'line' && Number.isFinite(d.prevClose);
            const refBaseline = isLineMode ? d.prevClose : refPrice;
            const priceColor = d.close >= refBaseline ? colorUp : colorDown;
            
            let pct = 0;
            if (isLineMode) {
                pct = ((d.close - d.prevClose) / d.prevClose) * 100;
            } else {
                pct = refPrice !== 0 ? ((d.close - refPrice) / refPrice * 100) : 0;
            }
            const pctText = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';

            const items = [
                { label: '', val: d.fullDate || d.displayDate || '', color: colorTextBright },
                { label: '开:', val: d.open.toFixed(1), color: priceColor },
                { label: '高:', val: d.high.toFixed(1), color: colorUp },
                { label: '低:', val: d.low.toFixed(1), color: colorDown },
                { label: '收:', val: d.close.toFixed(1), color: priceColor },
                { label: '幅:', val: pctText, color: priceColor },
                { label: '量:', val: this.formatVolume(d.volume), color: colorTextBright },
                { label: '仓:', val: this.formatVolume(d.hold), color: colorTextBright }
            ];
            if (this.chartType === 'line') {
                items.splice(
                    1,
                    items.length - 1,
                    { label: '价:', val: d.close.toFixed(1), color: priceColor },
                    ...(Number.isFinite(d.vwap) ? [{ label: '均:', val: d.vwap.toFixed(1), color: '#eab308' }] : []),
                    ...(Number.isFinite(d.tdoiWap) ? [{ label: '仓均:', val: d.tdoiWap.toFixed(1), color: '#0d9488' }] : []),
                    { label: '幅:', val: pctText, color: priceColor },
                    { label: '量:', val: this.formatVolume(d.volume), color: colorTextBright },
                    { label: '仓:', val: this.formatVolume(d.hold), color: colorTextBright }
                );
            }

            const isNarrow = w < 520;
            const row1Items = isNarrow ? items.slice(0, 5) : items;
            const row2Items = isNarrow ? items.slice(5) : [];

            const measureRowWidth = (rowItems) => {
                let rWidth = 0;
                rowItems.forEach((item, idx) => {
                    rWidth += ctx.measureText(item.label).width + (item.label ? 3 : 0) + ctx.measureText(item.val).width;
                    if (idx < rowItems.length - 1) {
                        rWidth += 10;
                    }
                });
                return rWidth;
            };

            const r1Width = measureRowWidth(row1Items);
            const r2Width = isNarrow ? measureRowWidth(row2Items) : 0;
            const bannerWidth = Math.max(r1Width, r2Width) + 10;
            const bannerHeight = isNarrow ? 34 : 20;

            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.85)';
            ctx.fillRect(this.paddingLeft + 5, this.paddingTop + 5, bannerWidth, bannerHeight);

            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Draw Row 1
            let textX = this.paddingLeft + 10;
            const y1 = this.paddingTop + (isNarrow ? 12 : 15);
            row1Items.forEach((item) => {
                if (item.label) {
                    ctx.fillStyle = colorText;
                    ctx.fillText(item.label, textX, y1);
                    textX += ctx.measureText(item.label).width + 3;
                }

                ctx.fillStyle = item.color;
                ctx.fillText(item.val, textX, y1);
                textX += ctx.measureText(item.val).width + 10;
            });

            // Draw Row 2
            if (isNarrow) {
                textX = this.paddingLeft + 10;
                const y2 = this.paddingTop + 25;
                row2Items.forEach((item) => {
                    if (item.label) {
                        ctx.fillStyle = colorText;
                        ctx.fillText(item.label, textX, y2);
                        textX += ctx.measureText(item.label).width + 3;
                    }

                    ctx.fillStyle = item.color;
                    ctx.fillText(item.val, textX, y2);
                    textX += ctx.measureText(item.val).width + 10;
                });
            }
        }

        // Determine boundary warning status for TPO / VP (insufficient or partial)
        const tpoNeedsWarning = this.tpoLevel !== 'none' && tpoProfile &&
            (!tpoProfile.rows || tpoProfile.rows.length === 0 ||
             tpoProfile.meta.dataQuality === 'insufficient');
        
        const levelNamesTpo = { '30m': '30m TPO', 'daily': '日 TPO', 'weekly': '周 TPO' };
        const tpoLvlName = levelNamesTpo[this.tpoLevel] || this.tpoLevel;
        
        const vpNeedsWarning = this.vpLevel !== 'none' && vpProfile &&
            (!vpProfile.rows || vpProfile.rows.length === 0 ||
             vpProfile.meta.dataQuality === 'insufficient');
        
        const levelNamesVp = { '30m': '30m VP', 'daily': '日 VP', 'weekly': '周 VP' };
        const vpLvlName = levelNamesVp[this.vpLevel] || this.vpLevel;

        // Update DOM warning items in the profile Limits Panel
        const profileLimitWarning = document.getElementById('profileLimitWarning');
        const profileLimitsPanel = document.getElementById('profileLimitsPanel');

        let showTpoWarn = this.tpoLevel !== 'none';
        let showVpWarn = this.vpLevel !== 'none';

        if (profileLimitWarning) {
            const isTpoActive = this.tpoLevel !== 'none' && tpoProfile;
            const isVpActive = this.vpLevel !== 'none' && vpProfile;

            if (isTpoActive && isVpActive) {
                if (tpoNeedsWarning && vpNeedsWarning) {
                    profileLimitWarning.classList.add('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'} 超过 ${vpLvlName}/${tpoLvlName}数据边界`;
                } else if (tpoNeedsWarning) {
                    profileLimitWarning.classList.add('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'} 超过 ${tpoLvlName}数据边界`;
                } else if (vpNeedsWarning) {
                    profileLimitWarning.classList.add('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'} 超过 ${vpLvlName}数据边界`;
                } else {
                    profileLimitWarning.classList.remove('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'}`;
                }
                profileLimitWarning.style.display = 'inline-flex';
            } else if (isTpoActive) {
                if (tpoNeedsWarning) {
                    profileLimitWarning.classList.add('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'} 超过 ${tpoLvlName}数据边界`;
                } else {
                    profileLimitWarning.classList.remove('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'}`;
                }
                profileLimitWarning.style.display = 'inline-flex';
            } else if (isVpActive) {
                if (vpNeedsWarning) {
                    profileLimitWarning.classList.add('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'} 超过 ${vpLvlName}数据边界`;
                } else {
                    profileLimitWarning.classList.remove('warning-item');
                    profileLimitWarning.textContent = `当前区间：${endDate || '未知'}`;
                }
                profileLimitWarning.style.display = 'inline-flex';
            } else {
                profileLimitWarning.style.display = 'none';
            }
        }

        if (profileLimitsPanel) {
            const limitTpoInfo = document.getElementById('limitTpoInfo');
            const limitVpInfo = document.getElementById('limitVpInfo');
            const hasVisibleInfo = (limitTpoInfo && limitTpoInfo.style.display !== 'none') || 
                                   (limitVpInfo && limitVpInfo.style.display !== 'none');
            
            if (showTpoWarn || showVpWarn || hasVisibleInfo) {
                profileLimitsPanel.style.display = 'flex';
            } else {
                profileLimitsPanel.style.display = 'none';
            }
        }

        // Draw profile tooltips if K-line is locked AND mouse is hovering inside the locked K-line column
        if (this.selectedBarIndex !== -1 && this.hoverIndex === this.selectedBarIndex) {
            const targetX = this.mouseX;
            const targetY = this.mouseY;
            
            if (targetX !== -1 && targetY !== -1) {
                const findNearestVisibleProfileRow = (profile, yVal) => {
                    let nearest = null;
                    let nearestDistance = Infinity;
                    profile.rows.forEach(row => {
                        const rowY = getPriceY(row.price);
                        if (!isYInPricePane(rowY)) return;
                        const distance = Math.abs(rowY - yVal);
                        if (distance < nearestDistance) {
                            nearest = row;
                            nearestDistance = distance;
                        }
                    });
                    return nearest;
                };

                const isTpoActive = this.tpoLevel !== 'none' && tpoProfile && tpoProfile.rows && tpoProfile.rows.length > 0;
                const isVpActive = this.vpLevel !== 'none' && vpProfile && vpProfile.rows && vpProfile.rows.length > 0;

                if (isTpoActive && isVpActive) {
                    const rowTpo = findNearestVisibleProfileRow(tpoProfile, targetY);
                    const rowVp = findNearestVisibleProfileRow(vpProfile, targetY);
                    if (rowTpo && rowVp) {
                        this.drawAggregatedProfileTooltip(rowTpo, rowVp, tpoProfile, vpProfile, targetX, targetY, w, h);
                    }
                } else if (isTpoActive) {
                    const rowTpo = findNearestVisibleProfileRow(tpoProfile, targetY);
                    if (rowTpo) {
                        this.drawProfileTooltip('tpo', rowTpo, tpoProfile, targetX, targetY, w, h);
                    }
                } else if (isVpActive) {
                    const rowVp = findNearestVisibleProfileRow(vpProfile, targetY);
                    if (rowVp) {
                        this.drawProfileTooltip('volume', rowVp, vpProfile, targetX, targetY, w, h);
                    }
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

            // 2. Draw Trend Lines
            const drawTrendLine = (trendline, previewPoint = null) => {
                if (!trendline || !trendline.points || !trendline.points.length) return;
                const points = previewPoint ? [trendline.points[0], previewPoint] : trendline.points;
                if (points.length < 2) return;
                
                const renderLine = this.getTrendLineRenderPoints({ points });
                if (!renderLine) return;
                
                const isSelected = (trendline === this.selectedTrendLine);
                ctx.save();
                ctx.beginPath();
                ctx.rect(this.paddingLeft, this.paddingTop, w - this.paddingLeft - this.paddingRight, priceHeight);
                ctx.clip();
                ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(99, 102, 241, 0.9)';
                ctx.lineWidth = isSelected ? 2 : 1.5;
                ctx.beginPath();
                ctx.moveTo(renderLine.x1, renderLine.y1);
                ctx.lineTo(renderLine.x2, renderLine.y2);
                ctx.stroke();
                ctx.restore();

                points.forEach((pt, idxVal) => {
                    const x = this.xFromIndex(pt.index);
                    const y = this.yFromPrice(pt.price);
                    if (x >= this.paddingLeft && x <= w - this.paddingRight && y >= this.paddingTop && y <= this.paddingTop + priceHeight) {
                        const isVertexSelected = isSelected && (idxVal === this.selectedVertexIndex);
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = isVertexSelected ? '#ef4444' : '#6366f1';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(x, y, isVertexSelected ? 5 : 4, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                    }
                });
            };

            this.drawings.trendlines.forEach(trendline => {
                if (trendline.points && trendline.points.length >= 2) {
                    drawTrendLine(trendline);
                }
            });

            if (this.activeTrendLine && this.activeTrendLine.points && this.activeTrendLine.points.length === 1 && this.mouseX >= this.paddingLeft && this.mouseX <= w - this.paddingRight && this.mouseY >= this.paddingTop && this.mouseY <= this.paddingTop + priceHeight) {
                drawTrendLine(this.activeTrendLine, {
                    index: this.indexFromX(this.mouseX),
                    price: this.priceFromY(this.mouseY)
                });
            }

            // 3. Draw Polylines
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
            const isSimulatedFS = this.canvas.closest('.chart-panel')?.classList.contains('mobile-fullscreen-simulated');
            const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
            const isRotated = isSimulatedFS && isPortrait;
            
            const trackRect = track.getBoundingClientRect();
            const trackWidth = isRotated ? trackRect.height : trackRect.width;
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
        return String(Math.round(num));
    }
}
