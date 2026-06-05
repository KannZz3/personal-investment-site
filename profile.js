/* ==========================================================================
   MARKET PROFILE CALCULATION ENGINE (personal-investment-site/profile.js)
   ========================================================================== */

const TICK_SIZES = {
    'AU': 0.02,
    'AG': 1,
    'CU': 10,
    'AL': 5,
    'ZN': 5,
    'PB': 5,
    'NI': 10,
    'SN': 10,
    'RB': 1,
    'HC': 1,
    'SS': 5,
    'FU': 1,
    'BU': 1,
    'RU': 5,
    'SP': 2,
    'EB': 1,
    'SC': 0.1,
    'SR': 1,
    'TA': 2,
    'MA': 1,
    'FG': 1,
    'SA': 1,
    'I': 0.5,
    'JM': 0.5,
    'J': 0.5,
    'C': 1,
    'CS': 1,
    'Y': 2,
    'P': 2,
    'M': 1,
    'LH': 5,
    'LC': 50,
    'SI': 5
};

function getTickSize(symbol) {
    const cleanSym = symbol.replace(/\d+/g, '').toUpperCase();
    for (const [key, value] of Object.entries(TICK_SIZES)) {
        if (cleanSym.startsWith(key)) {
            return value;
        }
    }
    return 1.0;
}

function getTradingDate(datetimeStr, dailyDates) {
    const dt = new Date(datetimeStr.replace(/-/g, '/'));
    const hour = dt.getHours();
    
    // Format to YYYY-MM-DD
    const pad = (n) => String(n).padStart(2, '0');
    const calDateStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    
    // Chinese futures night session starts at 21:00 (or later) and ends in early morning (next calendar day)
    // Saturday morning and Monday morning before 4am are night sessions of Friday/Sunday
    const isNightSession = (hour >= 17) || (dt.getDay() === 6 && hour < 4) || (dt.getDay() === 1 && hour < 4);
    
    if (!isNightSession) {
        return calDateStr;
    }
    
    // Find the next trading date from dailyDates list
    if (dailyDates && dailyDates.length > 0) {
        for (let i = 0; i < dailyDates.length; i++) {
            if (dailyDates[i] > calDateStr) {
                return dailyDates[i];
            }
        }
    }
    
    // Fallback: standard business day calculation
    let date = new Date(dt.getTime());
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getOptimalStep(rangeLow, rangeHigh, tickSize) {
    const ticks = (rangeHigh - rangeLow) / tickSize;
    if (ticks <= 150) {
        return tickSize;
    }
    const rawStep = (rangeHigh - rangeLow) / 100;
    const multiplier = Math.ceil(rawStep / tickSize);
    return tickSize * multiplier;
}

// ─────────────────────────────────────────────────────────────────────────────
// TPO PROFILE BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildTpoProfile({ bars30m, tickSize, symbol, sessionDate, dailyDates }) {
    if (!bars30m || bars30m.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    // Filter to target session
    const sessionBars = bars30m.filter(bar => {
        const tDate = getTradingDate(bar.datetime, dailyDates);
        return tDate === sessionDate;
    });
    
    if (sessionBars.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    // Get ranges
    let rangeLow = Infinity;
    let rangeHigh = -Infinity;
    sessionBars.forEach(bar => {
        if (bar.low < rangeLow) rangeLow = bar.low;
        if (bar.high > rangeHigh) rangeHigh = bar.high;
    });
    
    const step = getOptimalStep(rangeLow, rangeHigh, tickSize);
    
    // Initialize price bins
    const numRows = Math.round((rangeHigh - rangeLow) / step) + 1;
    const priceBins = [];
    const tpoCounts = new Array(numRows).fill(0);
    const tpoPeriods = Array.from({ length: numRows }, () => new Set());
    
    for (let i = 0; i < numRows; i++) {
        priceBins.push(rangeLow + i * step);
    }
    
    // Process TPO periods (each 30m bar is a period)
    sessionBars.forEach((bar, periodIdx) => {
        const lowBin = Math.max(0, Math.floor((bar.low - rangeLow) / step));
        const highBin = Math.min(numRows - 1, Math.ceil((bar.high - rangeLow) / step));
        
        for (let i = lowBin; i <= highBin; i++) {
            tpoPeriods[i].add(periodIdx);
            tpoCounts[i] = tpoPeriods[i].size;
        }
    });
    
    // POC Calculation
    let maxTpos = 0;
    let pocIdx = 0;
    for (let i = 0; i < numRows; i++) {
        if (tpoCounts[i] > maxTpos) {
            maxTpos = tpoCounts[i];
            pocIdx = i;
        } else if (tpoCounts[i] === maxTpos && maxTpos > 0) {
            // Tie-breaker: closer to range midpoint
            const mid = numRows / 2;
            const distCurrent = Math.abs(i - mid);
            const distBest = Math.abs(pocIdx - mid);
            if (distCurrent < distBest) {
                pocIdx = i;
            }
        }
    }
    const poc = priceBins[pocIdx];
    
    // Value Area Calculation (70%)
    const totalTpo = tpoCounts.reduce((a, b) => a + b, 0);
    const targetTpos = totalTpo * 0.70;
    
    let valueAreaIndices = new Set([pocIdx]);
    let currentTpos = tpoCounts[pocIdx];
    let top = pocIdx - 1;
    let bottom = pocIdx + 1;
    
    while (currentTpos < targetTpos && (top >= 0 || bottom < numRows)) {
        let topTpos = 0;
        if (top >= 0) {
            topTpos += tpoCounts[top];
            if (top - 1 >= 0) topTpos += tpoCounts[top - 1];
        }
        
        let bottomTpos = 0;
        if (bottom < numRows) {
            bottomTpos += tpoCounts[bottom];
            if (bottom + 1 < numRows) bottomTpos += tpoCounts[bottom + 1];
        }
        
        if (topTpos >= bottomTpos && top >= 0) {
            valueAreaIndices.add(top);
            currentTpos += tpoCounts[top];
            top--;
        } else if (bottom < numRows) {
            valueAreaIndices.add(bottom);
            currentTpos += tpoCounts[bottom];
            bottom++;
        } else if (top >= 0) {
            valueAreaIndices.add(top);
            currentTpos += tpoCounts[top];
            top--;
        } else {
            break;
        }
    }
    
    let vah = -Infinity;
    let val = Infinity;
    valueAreaIndices.forEach(idx => {
        const price = priceBins[idx];
        if (price > vah) vah = price;
        if (price < val) val = price;
    });
    
    // If Value Area is empty or single node
    if (vah === -Infinity) vah = poc;
    if (val === Infinity) val = poc;
    
    // Intraday structure calculations
    // IB: first 2 periods (A and B)
    let ibHigh = null;
    let ibLow = null;
    let ibWidth = null;
    if (sessionBars.length >= 2) {
        ibHigh = Math.max(sessionBars[0].high, sessionBars[1].high);
        ibLow = Math.min(sessionBars[0].low, sessionBars[1].low);
        ibWidth = ibHigh - ibLow;
    }
    
    const rangeExtensionUp = ibHigh !== null ? Math.max(0, rangeHigh - ibHigh) : 0;
    const rangeExtensionDown = ibLow !== null ? Math.max(0, ibLow - rangeLow) : 0;
    
    // Tails (single TPO at extremes)
    let buyingTailLength = 0;
    for (let i = 0; i < numRows; i++) {
        if (tpoCounts[i] === 1) {
            buyingTailLength++;
        } else {
            break;
        }
    }
    
    let sellingTailLength = 0;
    for (let i = numRows - 1; i >= 0; i--) {
        if (tpoCounts[i] === 1) {
            sellingTailLength++;
        } else {
            break;
        }
    }
    
    // Single print count
    let singlePrintCount = 0;
    for (let i = buyingTailLength; i < numRows - sellingTailLength; i++) {
        if (tpoCounts[i] === 1) {
            singlePrintCount++;
        }
    }
    
    // Day type classification
    let dayType = "Normal Day";
    if (ibWidth !== null) {
        const totalRange = rangeHigh - rangeLow;
        const ibRatio = ibWidth / totalRange;
        if (rangeExtensionUp > 0 && rangeExtensionDown > 0) {
            dayType = "Neutral Day";
        } else if (rangeExtensionUp > 0 || rangeExtensionDown > 0) {
            if (ibRatio < 0.35) {
                dayType = "Trend Day";
            } else {
                dayType = "Normal Variation Day";
            }
        } else {
            if (totalRange < tickSize * 15) {
                dayType = "Non-Trend Day";
            } else {
                dayType = "Normal Day";
            }
        }
    }
    
    // Map rows
    const rows = priceBins.map((price, idx) => ({
        price: price,
        value: tpoCounts[idx],
        normalizedValue: maxTpos > 0 ? tpoCounts[idx] / maxTpos : 0,
        isPoc: idx === pocIdx,
        isValueArea: valueAreaIndices.has(idx)
    }));
    
    return {
        type: "tpo",
        level: "30m",
        symbol: symbol,
        endDate: sessionDate,
        lookback: "1D",
        poc: poc,
        vah: vah,
        val: val,
        rangeHigh: rangeHigh,
        rangeLow: rangeLow,
        rows: rows,
        meta: {
            totalTpo: totalTpo,
            ibHigh: ibHigh,
            ibLow: ibLow,
            ibWidth: ibWidth,
            rangeExtensionUp: rangeExtensionUp,
            rangeExtensionDown: rangeExtensionDown,
            buyingTailLength: buyingTailLength,
            sellingTailLength: sellingTailLength,
            singlePrintCount: singlePrintCount,
            dayType: dayType,
            dataQuality: "full"
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME PROFILE BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildVolumeProfile({ bars1m, tickSize, symbol, sessionDate, dailyDates, allocationMethod = "uniform" }) {
    if (!bars1m || bars1m.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    // Filter to target session
    const sessionBars = bars1m.filter(bar => {
        const tDate = getTradingDate(bar.datetime || bar.date, dailyDates);
        return tDate === sessionDate;
    });
    
    if (sessionBars.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    // Get ranges
    let rangeLow = Infinity;
    let rangeHigh = -Infinity;
    sessionBars.forEach(bar => {
        if (bar.low < rangeLow) rangeLow = bar.low;
        if (bar.high > rangeHigh) rangeHigh = bar.high;
    });
    
    const step = getOptimalStep(rangeLow, rangeHigh, tickSize);
    
    // Initialize price bins
    const numRows = Math.round((rangeHigh - rangeLow) / step) + 1;
    const priceBins = [];
    const volCounts = new Array(numRows).fill(0);
    
    for (let i = 0; i < numRows; i++) {
        priceBins.push(rangeLow + i * step);
    }
    
    // Volume Allocation
    sessionBars.forEach(bar => {
        const lowBin = Math.max(0, Math.floor((bar.low - rangeLow) / step));
        const highBin = Math.min(numRows - 1, Math.ceil((bar.high - rangeLow) / step));
        const count = highBin - lowBin + 1;
        
        if (count > 0) {
            const alloc = bar.volume / count;
            for (let i = lowBin; i <= highBin; i++) {
                volCounts[i] += alloc;
            }
        }
    });
    
    // Volume POC
    let maxVol = 0;
    let pocIdx = 0;
    for (let i = 0; i < numRows; i++) {
        if (volCounts[i] > maxVol) {
            maxVol = volCounts[i];
            pocIdx = i;
        }
    }
    const poc = priceBins[pocIdx];
    
    // Volume Value Area (70%)
    const totalVolume = volCounts.reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.70;
    
    let valueAreaIndices = new Set([pocIdx]);
    let currentVolume = volCounts[pocIdx];
    let top = pocIdx - 1;
    let bottom = pocIdx + 1;
    
    while (currentVolume < targetVolume && (top >= 0 || bottom < numRows)) {
        let topVol = 0;
        if (top >= 0) {
            topVol += volCounts[top];
            if (top - 1 >= 0) topVol += volCounts[top - 1];
        }
        
        let bottomVol = 0;
        if (bottom < numRows) {
            bottomVol += volCounts[bottom];
            if (bottom + 1 < numRows) bottomVol += volCounts[bottom + 1];
        }
        
        if (topVol >= bottomVol && top >= 0) {
            valueAreaIndices.add(top);
            currentVolume += volCounts[top];
            top--;
        } else if (bottom < numRows) {
            valueAreaIndices.add(bottom);
            currentVolume += volCounts[bottom];
            bottom++;
        } else if (top >= 0) {
            valueAreaIndices.add(top);
            currentVolume += volCounts[top];
            top--;
        } else {
            break;
        }
    }
    
    let vah = -Infinity;
    let val = Infinity;
    valueAreaIndices.forEach(idx => {
        const price = priceBins[idx];
        if (price > vah) vah = price;
        if (price < val) val = price;
    });
    
    if (vah === -Infinity) vah = poc;
    if (val === Infinity) val = poc;
    
    // HVN / LVN Nodes extraction
    // Smooth the curve (simple 3-bin moving average)
    const smoothed = new Array(numRows).fill(0);
    for (let i = 0; i < numRows; i++) {
        const leftVal = i > 0 ? volCounts[i - 1] : volCounts[i];
        const rightVal = i < numRows - 1 ? volCounts[i + 1] : volCounts[i];
        smoothed[i] = (leftVal + volCounts[i] + rightVal) / 3;
    }
    
    const hvnCandidates = [];
    const lvnCandidates = [];
    
    for (let i = 2; i < numRows - 2; i++) {
        if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1] &&
            smoothed[i] > smoothed[i - 2] && smoothed[i] > smoothed[i + 2]) {
            hvnCandidates.push({ price: priceBins[i], volume: volCounts[i] });
        }
        if (smoothed[i] < smoothed[i - 1] && smoothed[i] < smoothed[i + 1] &&
            smoothed[i] < smoothed[i - 2] && smoothed[i] < smoothed[i + 2]) {
            lvnCandidates.push({ price: priceBins[i], volume: volCounts[i] });
        }
    }
    
    const hvnList = hvnCandidates.sort((a, b) => b.volume - a.volume).slice(0, 3).map(c => c.price);
    const lvnList = lvnCandidates.sort((a, b) => a.volume - b.volume).slice(0, 3).map(c => c.price);
    
    const rows = priceBins.map((price, idx) => ({
        price: price,
        value: volCounts[idx],
        normalizedValue: maxVol > 0 ? volCounts[idx] / maxVol : 0,
        isPoc: idx === pocIdx,
        isValueArea: valueAreaIndices.has(idx),
        isHvn: hvnList.includes(price),
        isLvn: lvnList.includes(price)
    }));
    
    return {
        type: "volume",
        level: "30m",
        symbol: symbol,
        endDate: sessionDate,
        lookback: "1D",
        poc: poc,
        vah: vah,
        val: val,
        rangeHigh: rangeHigh,
        rangeLow: rangeLow,
        rows: rows,
        meta: {
            totalVolume: totalVolume,
            hvnList: hvnList,
            lvnList: lvnList,
            dataQuality: "fallback" // We fallback to 15m/30m data in frontend
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY COMPOSITE TPO
// ─────────────────────────────────────────────────────────────────────────────
function buildDailyCompositeTpo({ bars30m, tickSize, symbol, endDate, dailyDates, lookbackDays = 20 }) {
    if (!bars30m || bars30m.length === 0 || !dailyDates || dailyDates.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    // Find the last N trading dates <= endDate
    const validDates = dailyDates.filter(d => d <= endDate).slice(-lookbackDays);
    if (validDates.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    const compositeBars = bars30m.filter(bar => {
        const tDate = getTradingDate(bar.datetime, dailyDates);
        return validDates.includes(tDate);
    });
    
    if (compositeBars.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    // Get ranges
    let rangeLow = Infinity;
    let rangeHigh = -Infinity;
    compositeBars.forEach(bar => {
        if (bar.low < rangeLow) rangeLow = bar.low;
        if (bar.high > rangeHigh) rangeHigh = bar.high;
    });
    
    const step = getOptimalStep(rangeLow, rangeHigh, tickSize);
    const numRows = Math.round((rangeHigh - rangeLow) / step) + 1;
    const priceBins = [];
    const tpoCounts = new Array(numRows).fill(0);
    
    for (let i = 0; i < numRows; i++) {
        priceBins.push(rangeLow + i * step);
    }
    
    compositeBars.forEach((bar, idx) => {
        const lowBin = Math.max(0, Math.floor((bar.low - rangeLow) / step));
        const highBin = Math.min(numRows - 1, Math.ceil((bar.high - rangeLow) / step));
        
        for (let i = lowBin; i <= highBin; i++) {
            tpoCounts[i]++;
        }
    });
    
    let maxTpos = 0;
    let pocIdx = 0;
    for (let i = 0; i < numRows; i++) {
        if (tpoCounts[i] > maxTpos) {
            maxTpos = tpoCounts[i];
            pocIdx = i;
        }
    }
    const poc = priceBins[pocIdx];
    
    const totalTpo = tpoCounts.reduce((a, b) => a + b, 0);
    const targetTpos = totalTpo * 0.70;
    
    let valueAreaIndices = new Set([pocIdx]);
    let currentTpos = tpoCounts[pocIdx];
    let top = pocIdx - 1;
    let bottom = pocIdx + 1;
    
    while (currentTpos < targetTpos && (top >= 0 || bottom < numRows)) {
        let topTpos = 0;
        if (top >= 0) {
            topTpos += tpoCounts[top];
            if (top - 1 >= 0) topTpos += tpoCounts[top - 1];
        }
        
        let bottomTpos = 0;
        if (bottom < numRows) {
            bottomTpos += tpoCounts[bottom];
            if (bottom + 1 < numRows) bottomTpos += tpoCounts[bottom + 1];
        }
        
        if (topTpos >= bottomTpos && top >= 0) {
            valueAreaIndices.add(top);
            currentTpos += tpoCounts[top];
            top--;
        } else if (bottom < numRows) {
            valueAreaIndices.add(bottom);
            currentTpos += tpoCounts[bottom];
            bottom++;
        } else if (top >= 0) {
            valueAreaIndices.add(top);
            currentTpos += tpoCounts[top];
            top--;
        } else {
            break;
        }
    }
    
    let vah = -Infinity;
    let val = Infinity;
    valueAreaIndices.forEach(idx => {
        const price = priceBins[idx];
        if (price > vah) vah = price;
        if (price < val) val = price;
    });
    
    if (vah === -Infinity) vah = poc;
    if (val === Infinity) val = poc;
    
    const rows = priceBins.map((price, idx) => ({
        price: price,
        value: tpoCounts[idx],
        normalizedValue: maxTpos > 0 ? tpoCounts[idx] / maxTpos : 0,
        isPoc: idx === pocIdx,
        isValueArea: valueAreaIndices.has(idx)
    }));
    
    return {
        type: "tpo",
        level: "daily",
        symbol: symbol,
        endDate: endDate,
        lookback: `${lookbackDays}D`,
        poc: poc,
        vah: vah,
        val: val,
        rangeHigh: rangeHigh,
        rangeLow: rangeLow,
        rows: rows,
        meta: {
            totalTpo: totalTpo,
            dataQuality: "full"
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY COMPOSITE VOLUME
// ─────────────────────────────────────────────────────────────────────────────
function buildDailyCompositeVolume({ bars1m, tickSize, symbol, endDate, dailyDates, lookbackDays = 20 }) {
    if (!bars1m || bars1m.length === 0 || !dailyDates || dailyDates.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    const validDates = dailyDates.filter(d => d <= endDate).slice(-lookbackDays);
    if (validDates.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    const compositeBars = bars1m.filter(bar => {
        const tDate = getTradingDate(bar.datetime || bar.date, dailyDates);
        return validDates.includes(tDate);
    });
    
    if (compositeBars.length === 0) {
        return { meta: { dataQuality: "insufficient" } };
    }
    
    let rangeLow = Infinity;
    let rangeHigh = -Infinity;
    compositeBars.forEach(bar => {
        if (bar.low < rangeLow) rangeLow = bar.low;
        if (bar.high > rangeHigh) rangeHigh = bar.high;
    });
    
    const step = getOptimalStep(rangeLow, rangeHigh, tickSize);
    const numRows = Math.round((rangeHigh - rangeLow) / step) + 1;
    const priceBins = [];
    const volCounts = new Array(numRows).fill(0);
    
    for (let i = 0; i < numRows; i++) {
        priceBins.push(rangeLow + i * step);
    }
    
    compositeBars.forEach(bar => {
        const lowBin = Math.max(0, Math.floor((bar.low - rangeLow) / step));
        const highBin = Math.min(numRows - 1, Math.ceil((bar.high - rangeLow) / step));
        const count = highBin - lowBin + 1;
        
        if (count > 0) {
            const alloc = bar.volume / count;
            for (let i = lowBin; i <= highBin; i++) {
                volCounts[i] += alloc;
            }
        }
    });
    
    let maxVol = 0;
    let pocIdx = 0;
    for (let i = 0; i < numRows; i++) {
        if (volCounts[i] > maxVol) {
            maxVol = volCounts[i];
            pocIdx = i;
        }
    }
    const poc = priceBins[pocIdx];
    
    const totalVolume = volCounts.reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.70;
    
    let valueAreaIndices = new Set([pocIdx]);
    let currentVolume = volCounts[pocIdx];
    let top = pocIdx - 1;
    let bottom = pocIdx + 1;
    
    while (currentVolume < targetVolume && (top >= 0 || bottom < numRows)) {
        let topVol = 0;
        if (top >= 0) {
            topVol += volCounts[top];
            if (top - 1 >= 0) topVol += volCounts[top - 1];
        }
        
        let bottomVol = 0;
        if (bottom < numRows) {
            bottomVol += volCounts[bottom];
            if (bottom + 1 < numRows) bottomVol += volCounts[bottom + 1];
        }
        
        if (topVol >= bottomVol && top >= 0) {
            valueAreaIndices.add(top);
            currentVolume += volCounts[top];
            top--;
        } else if (bottom < numRows) {
            valueAreaIndices.add(bottom);
            currentVolume += volCounts[bottom];
            bottom++;
        } else if (top >= 0) {
            valueAreaIndices.add(top);
            currentVolume += volCounts[top];
            top--;
        } else {
            break;
        }
    }
    
    let vah = -Infinity;
    let val = Infinity;
    valueAreaIndices.forEach(idx => {
        const price = priceBins[idx];
        if (price > vah) vah = price;
        if (price < val) val = price;
    });
    
    if (vah === -Infinity) vah = poc;
    if (val === Infinity) val = poc;
    
    const smoothed = new Array(numRows).fill(0);
    for (let i = 0; i < numRows; i++) {
        const leftVal = i > 0 ? volCounts[i - 1] : volCounts[i];
        const rightVal = i < numRows - 1 ? volCounts[i + 1] : volCounts[i];
        smoothed[i] = (leftVal + volCounts[i] + rightVal) / 3;
    }
    
    const hvnCandidates = [];
    const lvnCandidates = [];
    for (let i = 2; i < numRows - 2; i++) {
        if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1] &&
            smoothed[i] > smoothed[i - 2] && smoothed[i] > smoothed[i + 2]) {
            hvnCandidates.push({ price: priceBins[i], volume: volCounts[i] });
        }
        if (smoothed[i] < smoothed[i - 1] && smoothed[i] < smoothed[i + 1] &&
            smoothed[i] < smoothed[i - 2] && smoothed[i] < smoothed[i + 2]) {
            lvnCandidates.push({ price: priceBins[i], volume: volCounts[i] });
        }
    }
    
    const hvnList = hvnCandidates.sort((a, b) => b.volume - a.volume).slice(0, 3).map(c => c.price);
    const lvnList = lvnCandidates.sort((a, b) => a.volume - b.volume).slice(0, 3).map(c => c.price);
    
    const rows = priceBins.map((price, idx) => ({
        price: price,
        value: volCounts[idx],
        normalizedValue: maxVol > 0 ? volCounts[idx] / maxVol : 0,
        isPoc: idx === pocIdx,
        isValueArea: valueAreaIndices.has(idx),
        isHvn: hvnList.includes(price),
        isLvn: lvnList.includes(price)
    }));
    
    return {
        type: "volume",
        level: "daily",
        symbol: symbol,
        endDate: endDate,
        lookback: `${lookbackDays}D`,
        poc: poc,
        vah: vah,
        val: val,
        rangeHigh: rangeHigh,
        rangeLow: rangeLow,
        rows: rows,
        meta: {
            totalVolume: totalVolume,
            hvnList: hvnList,
            lvnList: lvnList,
            dataQuality: "fallback"
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY COMPOSITE TPO
// ─────────────────────────────────────────────────────────────────────────────
function buildWeeklyCompositeTpo({ bars30m, tickSize, symbol, endDate, dailyDates, lookbackWeeks = 8 }) {
    // 8 Weeks composite runs over the last 40 trading sessions
    return buildDailyCompositeTpo({
        bars30m,
        tickSize,
        symbol,
        endDate,
        dailyDates,
        lookbackDays: lookbackWeeks * 5
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY COMPOSITE VOLUME
// ─────────────────────────────────────────────────────────────────────────────
function buildWeeklyCompositeVolume({ bars1m, tickSize, symbol, endDate, dailyDates, lookbackWeeks = 8 }) {
    // 8 Weeks composite runs over the last 40 trading sessions
    return buildDailyCompositeVolume({
        bars1m,
        tickSize,
        symbol,
        endDate,
        dailyDates,
        lookbackDays: lookbackWeeks * 5
    });
}

function checkProfileDataAvailability({
    symbol,
    profileType,
    profileLevel,
    requestedEndDate,
    dailyDates,
    barsDict,
    preferredFrequency,
    fallbackFrequencies
}) {
    // 1. Get required lookback days
    let lookbackDays = 1;
    if (profileLevel === 'daily') {
        lookbackDays = 20;
    } else if (profileLevel === 'weekly') {
        lookbackDays = 40; // 8 weeks * 5 days = 40
    }
    
    // 2. Find actualEndDate in dailyDates <= requestedEndDate
    if (!dailyDates || dailyDates.length === 0) {
        return {
            canBuild: false,
            insufficientReason: "No daily trading dates available."
        };
    }
    
    let endIdx = -1;
    for (let i = dailyDates.length - 1; i >= 0; i--) {
        if (dailyDates[i] <= requestedEndDate) {
            endIdx = i;
            break;
        }
    }
    
    if (endIdx === -1) {
        return {
            canBuild: false,
            insufficientReason: `Requested end date ${requestedEndDate} is before any available trading dates.`
        };
    }
    
    const actualEndDate = dailyDates[endIdx];
    const startIdx = Math.max(0, endIdx - lookbackDays + 1);
    
    // For composites, lookback window MUST be fully covered.
    if (profileLevel !== '30m' && (endIdx - startIdx + 1) < lookbackDays) {
        return {
            canBuild: false,
            insufficientReason: `Insufficient trading days history. Required ${lookbackDays} days, but only have ${endIdx - startIdx + 1} days.`
        };
    }
    
    const targetDates = dailyDates.slice(startIdx, endIdx + 1);
    const targetStartDate = targetDates[0];
    
    // Helper to check coverage for a specific frequency
    const checkFrequencyCoverage = (freq) => {
        const bars = barsDict[freq];
        if (!bars || bars.length === 0) {
            return { covered: false, reason: "No data available for frequency " + freq };
        }
        
        const firstBar = bars[0];
        const lastBar = bars[bars.length - 1];
        
        const earliest = getTradingDate(firstBar.datetime || firstBar.date, dailyDates);
        const latest = getTradingDate(lastBar.datetime || lastBar.date, dailyDates);
        
        // Coverage check
        if (profileLevel === '30m') {
            if (earliest <= actualEndDate && latest >= actualEndDate) {
                // Find bars matching actualEndDate
                const matchingBars = bars.filter(b => getTradingDate(b.datetime || b.date, dailyDates) === actualEndDate);
                if (matchingBars.length > 0) {
                    return {
                        covered: true,
                        earliest,
                        latest,
                        startTime: matchingBars[0].datetime || matchingBars[0].date,
                        endTime: matchingBars[matchingBars.length - 1].datetime || matchingBars[matchingBars.length - 1].date
                    };
                } else {
                    return { covered: false, reason: `No bars found for date ${actualEndDate} in frequency ${freq}` };
                }
            } else {
                return { covered: false, reason: `Data range [${earliest}, ${latest}] does not cover session date ${actualEndDate}` };
            }
        } else {
            // Composite
            if (earliest <= targetStartDate && latest >= actualEndDate) {
                const matchingBars = bars.filter(b => {
                    const tDate = getTradingDate(b.datetime || b.date, dailyDates);
                    return tDate >= targetStartDate && tDate <= actualEndDate;
                });
                if (matchingBars.length > 0) {
                    return {
                        covered: true,
                        earliest,
                        latest,
                        startTime: matchingBars[0].datetime || matchingBars[0].date,
                        endTime: matchingBars[matchingBars.length - 1].datetime || matchingBars[matchingBars.length - 1].date
                    };
                } else {
                    return { covered: false, reason: `No bars found in target range [${targetStartDate}, ${actualEndDate}] for frequency ${freq}` };
                }
            } else {
                return { covered: false, reason: `Data range [${earliest}, ${latest}] does not cover lookback window [${targetStartDate}, ${actualEndDate}]` };
            }
        }
    };
    
    // 3. Test preferred frequency
    const prefResult = checkFrequencyCoverage(preferredFrequency);
    if (prefResult.covered) {
        return {
            canBuild: true,
            actualFrequencyUsed: preferredFrequency,
            earliestAvailableTime: prefResult.earliest,
            latestAvailableTime: prefResult.latest,
            adjustedStartTime: prefResult.startTime,
            adjustedEndTime: prefResult.endTime,
            fallbackUsed: false
        };
    }
    
    // 4. Test fallback frequencies
    if (fallbackFrequencies && fallbackFrequencies.length > 0) {
        for (const fallbackFreq of fallbackFrequencies) {
            const fallbackResult = checkFrequencyCoverage(fallbackFreq);
            if (fallbackResult.covered) {
                return {
                    canBuild: true,
                    actualFrequencyUsed: fallbackFreq,
                    earliestAvailableTime: fallbackResult.earliest,
                    latestAvailableTime: fallbackResult.latest,
                    adjustedStartTime: fallbackResult.startTime,
                    adjustedEndTime: fallbackResult.endTime,
                    fallbackUsed: true,
                    fallbackReason: `Preferred frequency ${preferredFrequency} coverage insufficient (${prefResult.reason}). Fell back to ${fallbackFreq}.`
                };
            }
        }
    }
    
    // 5. If everything failed
    return {
        canBuild: false,
        actualFrequencyUsed: preferredFrequency,
        fallbackUsed: false,
        insufficientReason: `Coverage check failed for preferred frequency ${preferredFrequency} and all fallbacks. Preferred failed because: ${prefResult.reason}`
    };
}

function getEarliestTradingDate(bars, dailyDates) {
    if (!bars || bars.length === 0) return "无数据";
    const firstBar = bars[0];
    return getTradingDate(firstBar.datetime || firstBar.date, dailyDates);
}
