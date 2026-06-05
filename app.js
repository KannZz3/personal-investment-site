/* ==========================================================================
   CENTRAL SPA APPLICATION CONTROLLER & LOGIC (personal-investment-site/app.js)
   ========================================================================== */


// Global Application State
// Uses base commodity codes (AU, CU, RB, SC, SR, TA) as keys throughout.
// Actual contract symbols (e.g. AU2608) are loaded from JSON metadata dynamically.
const state = {
    theme: 'dark',
    activeTab: 'dashboard',
    contracts: {
        'AU': { name: '沪金主力',   symbol: 'AU',  exchange: 'SHFE', basePrice: 980,   multiplier: 1000, marginRate: 0.08, unit: '克' },
        'CU': { name: '沪铜主力',   symbol: 'CU',  exchange: 'SHFE', basePrice: 106000,multiplier: 5,    marginRate: 0.10, unit: '吨' },
        'RB': { name: '螺纹钢主力', symbol: 'RB',  exchange: 'SHFE', basePrice: 3150,  multiplier: 10,   marginRate: 0.09, unit: '吨' },
        'SC': { name: '原油主力',   symbol: 'SC',  exchange: 'INE',  basePrice: 595,   multiplier: 1000, marginRate: 0.11, unit: '桶' },
        'SR': { name: '白糖主力',   symbol: 'SR',  exchange: 'CZCE', basePrice: 5350,  multiplier: 10,   marginRate: 0.07, unit: '吨' },
        'TA': { name: 'PTA主力',    symbol: 'TA',  exchange: 'CZCE', basePrice: 6180,  multiplier: 5,    marginRate: 0.08, unit: '吨' }
    },
    activeContract: 'CU',
    chartPeriod: 'D', // 'D' (日K), 'W' (周K), 'Month' (月K), '15M', '30M', '60M'
    isDataReal: false,
    futuresData: {}, // Holds real or simulated data for each base commodity code
    realDataLoadError: false,
    selectedTpoProfileLevel: 'none', // 'none', '30m', 'daily', 'weekly'
    selectedVolumeProfileLevel: 'none' // 'none', '30m', 'daily', 'weekly'
};

// Custom articles database
const articles = [
    {
        id: 1,
        title: "支撑位的贝叶斯理解：价格条件如何改变上行概率",
        category: "essays",
        categoryName: "投资随笔",
        date: "2026-06-06",
        readTime: "6 分钟",
        excerpt: "如果价格守住关键支撑位，那么进一步上涨的概率将如何改变？本文通过条件概率框架，量化剖析支撑位作为‘市场状态切换变量’的本质逻辑与交易思考。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 在大宗商品和股票交易中，支撑位常被看作价格止跌企稳的心理关口。然而，如何用严谨的量化逻辑来度量支撑位对概率空间的影响？本文从贝叶斯概率框架出发，解析关键支撑位是如何通过改变市场观察样本空间，从而对后续上行概率产生关键的乘数效应。</p>
            
            <h2>一、 贝叶斯推导的核心模型</h2>
            <p>为了定量理解支撑位的作用，我们先设定一组合理的市场参数：</p>
            
            <p><strong>已知条件：</strong></p>
            <div class="math-block">
                P(价格 &gt; 1400 \mid 这周) = 20%
            </div>
            <div class="math-block">
                P(价格 &gt; 1500 \mid 这周) = 2%
            </div>
            
            <p><strong>求解目标：</strong></p>
            <p>在价格成功守住 1400（即 <span class="math-inline">价格 &gt; 1400</span>）的条件下，本周价格能进一步突破 1500 的条件概率：</p>
            <div class="math-block">
                P(价格 &gt; 1500 \mid 价格 &gt; 1400, 这周)
            </div>
            
            <p><strong>事件设定：</strong></p>
            <ul>
                <li>设 <span class="math-inline">A = \{价格 &gt; 1400\}</span> 为价格位于 1400 之上的事件</li>
                <li>设 <span class="math-inline">B = \{价格 &gt; 1500\}</span> 为价格位于 1500 之上的事件</li>
                <li>设 <span class="math-inline">W = \{这周\}</span> 为本周这一观察时间窗口</li>
            </ul>
            
            <p>由于价格只要位于 1500 之上，就必然位于 1400 之上，因此存在包含关系：</p>
            <div class="math-block">
                B \subset A
            </div>
            
            <h2>二、 公式推导过程</h2>
            <p>根据条件概率的基本公式：</p>
            <div class="math-block">
                P(B \mid A, W) = <div class="math-fraction"><span class="math-numerator">P(B, A, W)</span><span class="math-denominator">P(A, W)</span></div>
            </div>
            
            <p>又因为 <span class="math-inline">B \subset A</span>，所以联合事件 <span class="math-inline">P(B, A, W)</span> 可以简化为：</p>
            <div class="math-block">
                P(B, A, W) = P(B, W)
            </div>
            
            <p>将其带回原式，我们得到：</p>
            <div class="math-block">
                P(B \mid A, W) = <div class="math-fraction"><span class="math-numerator">P(B, W)</span><span class="math-denominator">P(A, W)</span></div>
            </div>
            
            <p>进一步展开为关于时间的条件概率：</p>
            <div class="math-block">
                P(B \mid A, W) = <div class="math-fraction"><span class="math-numerator">P(B \mid W) P(W)</span><span class="math-denominator">P(A \mid W) P(W)</span></div>
            </div>
            
            <p>由于在此我们讨论的基准时间段就是本周，因此 <span class="math-inline">P(W) = 1</span>，分子分母的 <span class="math-inline">P(W)</span> 相互抵消，得到最终模型：</p>
            <div class="math-block">
                P(B \mid A, W) = <div class="math-fraction"><span class="math-numerator">P(B \mid W)</span><span class="math-denominator">P(A \mid W)</span></div>
            </div>
            
            <p><strong>代入数据计算：</strong></p>
            <div class="math-block">
                P(价格 &gt; 1500 \mid 价格 &gt; 1400, 这周) = <div class="math-fraction"><span class="math-numerator">2%</span><span class="math-denominator">20%</span></div> = 10%
            </div>
            
            <h2>三、 贝叶斯视角下的交易思考</h2>
            <p>也就是说，在仅考虑“这周”这一时间背景时，价格能够触及 1500 之上的无条件概率只有 <strong>2%</strong>；但如果行情演进并进一步证实了“价格已经位于 1400 之上”这一前置条件，则进一步上行至 1500 的条件概率直接上升至 <strong>10%</strong>。</p>
            
            <p>这说明，<strong>支撑位的意义并不在于它必然推动价格上涨，而在于它改变了我们观察市场的样本空间。</strong></p>
            
            <p>两者的核心区别在于：</p>
            <ul>
                <li><strong>无条件问题：</strong> <span class="math-inline">P(价格 &gt; 1500 \mid 这周)</span> —— “这周价格涨到 1500 之上的概率是多少”。</li>
                <li><strong>条件问题：</strong> <span class="math-inline">P(价格 &gt; 1500 \mid 价格 &gt; 1400, 这周)</span> —— “如果价格守住 1400，那么它进一步涨到 1500 之上的概率是多少”。</li>
            </ul>
            
            <p>后者排除了跌破 1400 的弱势运行路径，只在“价格仍处于 1400 上方”的子样本空间中重新进行概率计算。因此，1500 的上行概率从 2% 提升到 10%，相当于<strong>提高了 5 倍</strong>。</p>
            
            <h2>四、 结论与实盘警示</h2>
            <p>但这并不意味着交易上可以简单得出“只要在 1400 做多即可”的盲目结论。因为：</p>
            <div class="math-block">
                P(价格 &gt; 1400 \mid 这周) = 20%
            </div>
            <p>这意味着价格能够守住 1400 本身也并不是高概率事件（仅有 20%）。真正的交易含义是：</p>
            <blockquote>
                <strong>1400 不是上涨的充分条件，而是市场状态切换的条件变量。</strong>
            </blockquote>
            <p>如果价格跌破 1400，1500 这一目标的现实意义极低；而如果价格有效守住 1400，则市场进入新的概率空间，价格上行至 1500 的条件概率显著高于无条件概率。</p>
            <p>因此，对于存在明显长期支撑区间的交易标的，不能只看无条件上行概率，而应把关键支撑位纳入条件概率框架。支撑位的核心价值，不是预测价格必然上涨，而是帮助我们识别：<strong>市场是否已经进入了一个更有利于上行目标实现的状态。</strong></p>
        `
    },
    {
        id: 4,
        title: "纸浆交割标准品企业极限完税成本测算分析",
        category: "shfe",
        categoryName: "上期所",
        date: "2026-06-06",
        readTime: "5 分钟",
        excerpt: "基于国内主流进口针叶浆及阔叶浆的企业进口通关数据，详尽构建纸浆主力合约标准交割品完税极限下的到货成本测算模型，评估期货主力合约当前定价的相对估值水位。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 纸浆作为高度依赖进口的造纸原料，其期货价格受到进口完税成本的强支撑。本文将详细解构纸浆主力交割品（漂针浆）在企业极限完税状态下的进口到货成本模型。</p>
            
            <h2>一、 纸浆极限完税价格计算公式</h2>
            <p>理论进口完税成本（元/吨）可以通过以下多维度参数公式测算：</p>
            <blockquote>
                <code>理论完税价 = (CIF美金报价 × 汇率 × (1 + 关税率) × (1 + 增值税率) + 港口杂费) × (1 + 资金利息损耗)</code>
            </blockquote>
            <p>1. <strong>CIF美金报价：</strong> 通常参考世界主要针叶浆厂（如加拿大、智利、芬兰等）对华报价。</p>
            <p>2. <strong>税率：</strong> 目前漂白针叶浆进口最惠国关税为 0%，增值税率为 13%。</p>
            <p>3. <strong>港口杂费与商检：</strong> 包含报关费、港杂费、卸船费、短途运费等，通常在 120-150 元/吨。</p>
            
            <h2>二、 多维度参数计算框架</h2>
            <p>在实际交割中，还需要加上仓库入库费、资金占用利息（一般按 1-2 个月测算）以及质检损耗费。最终的“企业交割限界成本”是评估盘面是否深度贴水于现货进口成本的重要安全边际参考。</p>
            <p><em>注：纸浆完税极限成本的精细分析报告正在整理中，今天稍后将同步上传更新完整数据。</em></p>
        `
    },
    {
        id: 5,
        title: "天然橡胶交割标准品企业极限完税成本测算分析",
        category: "shfe",
        categoryName: "上期所",
        date: "2026-06-06",
        readTime: "5 分钟",
        excerpt: "从海南、云南国产全乳胶与进口复合胶、混合胶关税结构出发，测算天然橡胶（RU）主力合约交割标准品在企业极限完税状态下的到货成本模型。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 天然橡胶主力合约（RU）交割品主要为国产全乳胶（SCR WF），而轮胎厂实际使用的原料则多为进口混合胶。由于两者的税率结构差异极大，理解进口完税成本对于把握 RU 合约的价格边界至关重要。</p>
            
            <h2>一、 橡胶税率结构与极限完税模型</h2>
            <p>进口天然胶面临较高的关税保护：</p>
            <ul>
                <li><strong>标准天然橡胶（烟片、技术分类胶）：</strong> 适用从量税或从值税（如 20% 关税），通关成本极高。</li>
                <li><strong>混合橡胶（税则号 40028000）：</strong> 关税为 0%，增值税 13%。因此轮胎企业和进口商极度偏向混合胶。</li>
            </ul>
            
            <h2>二、 企业极限完税到货成本计算</h2>
            <p>测算公式主要考量：混合胶的 CIF 东南亚美金报价、汇率、增值税（13%）、港杂仓储费（约 180 元/吨）、开证及信用利息。对比国产全乳胶交割理论价格与混合胶进口完税成本的“价差（Spread）”，能有效测算盘面价格的安全区间与压力边界。</p>
            <p><em>注：天然橡胶极限完税成本的精细数据模型正在录入整理中，今天稍后将同步上传更新。</em></p>
        `
    }
];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRouting();
    initArticleSection();
    // initCalculator replaced by technical UI rendered after data loads
    loadFuturesData();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
        });
    }
}

function setTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update theme toggle icon
    const icon = document.querySelector('#themeToggleBtn i');
    if (icon) {
        icon.className = theme === 'dark' ? 'lucide-sun' : 'lucide-moon';
        // Re-replace lucide icons if loaded
        if (window.lucide) window.lucide.createIcons();
    }

    // Rerender chart to apply theme-appropriate grid/text colors
    if (window.activeChart) {
        window.activeChart.render();
    }
}

// Router Management
function initRouting() {
    const navItems = document.querySelectorAll('nav li');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });
}

function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update active nav item
    document.querySelectorAll('nav li').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle active section visibility
    document.querySelectorAll('.page-section').forEach(section => {
        if (section.id === `${tabId}Section`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Resize and redraw canvas chart when switching back to dashboard
    if (tabId === 'dashboard' && window.activeChart) {
        setTimeout(() => {
            window.activeChart.resize();
        }, 100);
    }
}

// Futures Data Hub: Handles Sync / Simulation Mode
// 【数据同步机制与当前限制说明】：
// 1. 同步机制：本站定位为“在当前数据源覆盖范围内的每日更新动态期货分析网站”。每日更新完全依赖底层 sync_data.py 脚本或外部定时任务在每日收盘后运行，
//    并成功更新 data/futures_data.json 数据源文件。前端网页本身并不会直接从交易所抓取最新实盘数据，而是读取最新的 JSON 文件，
//    重新计算和渲染 derived results（如果数据源未被定时任务更新，重新加载页面仍会使用旧数据）。
// 2. 合约覆盖：本站已实现对所有交易所、所有合约的完整同步更新，每日收盘后更新所有 50+ 合约的详细日K与分钟级分时数据。
// 3. 周期与深度限制：受限于新浪等行情接口历史深度限制，分钟 K 线 (1m, 5m, 15m, 30m, 60m) 只包含最新最近约 1500 根 Bar 的历史数据；
//    日线包含完整 10 年历史连续合约数据，周线与月线由日线在前端动态压缩；TPO 与 Volume Profile (VP) 根据 1m, 5m, 30m 基础数据在前端进行算力 Profile 绘制。
async function loadFuturesData() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const syncTimeText = document.getElementById('syncTime');
    
    try {
        statusText.textContent = "正在检测数据...";
        const response = await fetch('./data/futures_data.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('File not found');
        const data = await response.json();
        
        // -------------------------------------------------------
        // 动态更新 state.contracts 中的合约信息（月份/持仓量）
        // -------------------------------------------------------
        if (data.metadata && data.metadata.contracts) {
            const anomalies = data.metadata.anomalies || [];
            
            // ONLY KEEP ANOMALIES in state.contracts for the Market Dashboard
            state.contracts = {};
            anomalies.forEach(code => {
                if (data.metadata.contracts[code]) {
                    state.contracts[code] = data.metadata.contracts[code];
                }
            });
            
            if (anomalies.length > 0) {
                state.activeContract = anomalies[0];
            } else {
                state.activeContract = null;
            }
        }
        
        // 将 JSON 数据以 baseCode 为 key 存入 state.futuresData
        Object.keys(state.contracts).forEach(baseCode => {
            if (data[baseCode]) {
                state.futuresData[baseCode] = data[baseCode];
            }
        });
        
        state.isDataReal = true;
        statusDot.className = 'status-dot synced';
        statusText.textContent = '全市场持仓异动扫描 ✓';
        
        if (data.metadata && data.metadata.sync_time) {
            const date = new Date(data.metadata.sync_time);
            syncTimeText.innerHTML = `在当前数据源覆盖范围内，本站为按日更新的动态数据页面。<br>` +
                                     `每日收盘后更新 data/futures_data.json，所有基于该数据源的筛选结果、技术异动、市场看板、K线图、MA/VOL、TPO/VP 等都会重新计算和刷新。(数据同步时间: ${date.toLocaleString()})`;
        }
        
        // Build the technical UI table and cards
        buildTechnicalUI(data);
        
    } catch (err) {
        console.warn('未检测到真实数据文件，启用高仿真演算模式。', err);
        state.isDataReal = false;
        generateMockData();
        
        statusDot.className = 'status-dot active';
        statusText.textContent = '行情模拟模式';
        syncTimeText.innerHTML = `演示模式 · 数据为模拟数据。<br>` +
                                 `在当前数据源覆盖范围内，本站为按日更新的动态数据页面。每日收盘后更新 data/futures_data.json，所有基于该数据源的筛选结果、技术异动、市场看板、K线图、MA/VOL、TPO/VP 等都会重新计算和刷新。`;
        
        startLiveTickerTimer();
    }
    
    // Build initial Dashboard UI
    buildDashboardUI();
    initializeChartComponent();
    startStatsSimulation();
}

// Generate premium simulated historical K-line datasets
function generateMockData() {
    const today = new Date();
    
    Object.keys(state.contracts).forEach(baseCode => {
        const contract = state.contracts[baseCode];
        const dataList = [];
        let price = contract.basePrice;
        const volatility = baseCode === 'AU' ? 0.006 : baseCode === 'CU' ? 0.009 : 0.012; // Gold has lower vol than rebar/sugar
        
        // Generate 2400 historical days (~10 years)
        for (let i = 2400; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            const dateStr = date.toISOString().slice(0, 10);
            
            // Random walk model for prices
            const changePct = (Math.random() - 0.49) * 2 * volatility; // slight upward drift
            const oldPrice = price;
            price = price * (1 + changePct);
            
            const high = Math.max(oldPrice, price) * (1 + Math.random() * volatility * 0.5);
            const low = Math.min(oldPrice, price) * (1 - Math.random() * volatility * 0.5);
            
            // Base contract volumes
            const baseVol = baseCode.startsWith('AU') ? 80000 : baseCode.startsWith('CU') ? 150000 : 800000;
            const volume = Math.round(baseVol * (0.6 + Math.random() * 0.8));
            const hold = Math.round(baseVol * 1.5 + (Math.random() - 0.5) * baseVol * 0.2);

            dataList.push({
                date: dateStr,
                open: parseFloat(oldPrice.toFixed(1)),
                high: parseFloat(high.toFixed(1)),
                low: parseFloat(low.toFixed(1)),
                close: parseFloat(price.toFixed(1)),
                volume: volume,
                hold: hold
            });
        }
        
        state.futuresData[baseCode] = {
            daily: dataList,
            min1: generateMinuteData(price, volatility * 0.25, 1000, 1),
            min5: generateMinuteData(price, volatility * 0.3, 1000, 5),
            min15: generateMinuteData(price, volatility * 0.4, 1000, 15),
            min30: generateMinuteData(price, volatility * 0.45, 1000, 30),
            min60: generateMinuteData(price, volatility * 0.5, 1000, 60)
        };
    });
}

function generateMinuteData(basePrice, volatility, numBars, intervalMinutes) {
    const dataList = [];
    let price = basePrice;
    const now = new Date();
    
    for (let i = numBars; i >= 0; i--) {
        const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${time.getFullYear()}-${pad(time.getMonth()+1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}:00`;
        
        const changePct = (Math.random() - 0.5) * 2 * volatility;
        const oldPrice = price;
        price = price * (1 + changePct);
        const high = Math.max(oldPrice, price) * (1 + Math.random() * volatility * 0.25);
        const low = Math.min(oldPrice, price) * (1 - Math.random() * volatility * 0.25);
        const volume = Math.round(5000 * (0.4 + Math.random() * 1.2));
        
        dataList.push({
            datetime: timeStr,
            open: parseFloat(oldPrice.toFixed(1)),
            high: parseFloat(high.toFixed(1)),
            low: parseFloat(low.toFixed(1)),
            close: parseFloat(price.toFixed(1)),
            volume: volume
        });
    }
    return dataList;
}

// Active UI Builder for Dashboard Ticker Cards
function buildDashboardUI() {
    const scrollContainer = document.getElementById('tickersScrollContainer');
    if (!scrollContainer) return;
    
    scrollContainer.innerHTML = '';
    
    const baseCodes = Object.keys(state.contracts);
    
    if (baseCodes.length === 0) {
        // Show empty state when no anomalies found
        scrollContainer.innerHTML = `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; flex: 1;">
                <i data-lucide="shield-check" style="width:24px; height:24px; margin-bottom: 0.5rem; color: var(--primary);"></i>
                <div style="font-weight: 600;">今日无符合持仓量异动条件的合约</div>
                <div style="font-size: 0.85rem; margin-top: 0.25rem;">全市场扫描未发现当前持仓量超过历史极值90%的主力合约</div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        document.getElementById('chartActiveTitle').textContent = `暂无异动标的`;
        document.getElementById('chartActiveSubtitle').textContent = `等待下次市场扫描...`;
        if (window.activeChart) window.activeChart.setData([]);
        return;
    }
    
    baseCodes.forEach(baseCode => {
        const contract = state.contracts[baseCode];
        const dataContainer = state.futuresData[baseCode];
        if (!dataContainer || !dataContainer.daily || !dataContainer.daily.length) return;
        
        const data = dataContainer.daily;
        const lastDay = data[data.length - 1];
        const prevDay = data[data.length - 2] || lastDay;
        
        const dailyChange = lastDay.close - prevDay.close;
        const dailyChangePct = (dailyChange / prevDay.close) * 100;
        
        const isUp = dailyChange >= 0;
        const colorClass = isUp ? 'price-up' : 'price-down';
        const sign = isUp ? '+' : '';
        
        // Display the actual contract month symbol (e.g. AU2608) from metadata, or base code
        const displaySym = contract.symbol || baseCode;
        
        // Technical Badges
        const alertType = contract.oiAnalysis?.alert;
        let badgeHtml = '';
        if (alertType === 'new_high') badgeHtml = '<span class="oi-badge oi-badge-new-high">创新高</span>';
        else if (alertType === 'near_high') badgeHtml = '<span class="oi-badge oi-badge-near-high">近历史高</span>';
        
        const cardClass = alertType === 'new_high' ? 'anomaly-new-high' : alertType === 'near_high' ? 'anomaly-near-high' : '';

        const card = document.createElement('div');
        card.className = `ticker-card ${baseCode === state.activeContract ? 'active' : ''} ${cardClass}`;
        card.id = `ticker-${baseCode}`;
        card.innerHTML = `
            <div class="ticker-card-header" style="margin-bottom: 0;">
                <div>
                    <span class="ticker-name">${contract.name}</span>
                    <span class="ticker-symbol">${displaySym}</span>
                </div>
                <span class="ticker-exchange">${contract.exchange}</span>
            </div>
            <div class="ticker-card-badges">${badgeHtml}</div>
            <div class="ticker-price ${colorClass}" id="price-${baseCode}" style="margin-top: 0.5rem;">${lastDay.close.toFixed(1)}</div>
            <div class="ticker-change ${colorClass}" id="change-${baseCode}">
                <span>${sign}${dailyChange.toFixed(1)}</span>
                <span>${sign}${dailyChangePct.toFixed(2)}%</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectContract(baseCode);
        });
        
        scrollContainer.appendChild(card);
    });
}

// Update Active Contract Selection
function selectContract(baseCode) {
    if (state.activeContract === baseCode) return;
    
    // Toggle active classes in ticker list
    const prevActiveCard = document.getElementById(`ticker-${state.activeContract}`);
    if (prevActiveCard) prevActiveCard.classList.remove('active');
    
    state.activeContract = baseCode;
    
    const activeCard = document.getElementById(`ticker-${baseCode}`);
    if (activeCard) activeCard.classList.add('active');
    
    // Rerender Chart & stats panels
    updateChartData();
    updateSidebarWidget();
}

// Chart Components Hooks
function initializeChartComponent() {
    window.activeChart = new FuturesChart('futuresChart');
    
    // Handle chart period change tabs
    const periodButtons = document.querySelectorAll('#chartPeriodGroup .btn-tab:not(.period-toggle-btn)');
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.chartPeriod = btn.getAttribute('data-period');
            updateChartData();
        });
    });

    // Expand / collapse the extra periods (15M, 30M, 1H, Month)
    const periodGroup = document.getElementById('chartPeriodGroup');
    const periodToggle = document.getElementById('periodToggle');
    let periodExpanded = false;

    if (periodToggle && periodGroup) {
        periodToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            periodExpanded = !periodExpanded;
            periodGroup.classList.toggle('expanded', periodExpanded);
            periodToggle.textContent = periodExpanded ? '\u00ab' : '\u00bb';
        });

        periodGroup.addEventListener('mouseleave', () => {
            if (periodExpanded) {
                periodExpanded = false;
                periodGroup.classList.remove('expanded');
                periodToggle.textContent = '\u00bb';
            }
        });
    }

    // Handle K-line style vs Tick line style
    const typeButtons = document.querySelectorAll('#chartTypeToolbar .btn-tab');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-type');
            window.activeChart.setChartType(type);
        });
    });

    // Handle indicator toggles with collapsible panel
    const indicatorGroup  = document.getElementById('indicatorGroup');
    const indicatorToggle = document.getElementById('indicatorToggle');
    const ma5Btn  = document.getElementById('indicatorMA5');
    const ma10Btn = document.getElementById('indicatorMA10');
    const ma20Btn = document.getElementById('indicatorMA20');
    const volBtn  = document.getElementById('indicatorVolume');

    let indicatorExpanded = false;

    // Helper: wire an indicator button to the chart
    const wireIndicator = (btn, indicator) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            window.activeChart.toggleIndicator(indicator);
        });
    };

    wireIndicator(ma5Btn, 'ma5');
    wireIndicator(ma10Btn, 'ma10');
    wireIndicator(ma20Btn, 'ma20');
    wireIndicator(volBtn, 'volume');

    // Expand / collapse the extra indicators (MA10, MA20)
    if (indicatorToggle && indicatorGroup) {
        indicatorToggle.addEventListener('click', () => {
            indicatorExpanded = !indicatorExpanded;
            indicatorGroup.classList.toggle('expanded', indicatorExpanded);
            indicatorToggle.textContent = indicatorExpanded ? '\u00ab' : '\u00bb';
        });
    }

    // Handle TPO Profile toolbar
    const tpoGroup = document.getElementById('chartTpoGroup');
    const tpoToggle = document.getElementById('tpoToggle');
    let tpoExpanded = false;

    if (tpoToggle && tpoGroup) {
        tpoToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            tpoExpanded = !tpoExpanded;
            tpoGroup.classList.toggle('expanded', tpoExpanded);
            tpoToggle.textContent = tpoExpanded ? '\u00ab' : '\u00bb';
        });

        tpoGroup.addEventListener('mouseleave', () => {
            if (tpoExpanded) {
                tpoExpanded = false;
                tpoGroup.classList.remove('expanded');
                tpoToggle.textContent = '\u00bb';
            }
        });
    }

    const tpoButtons = document.querySelectorAll('#chartTpoGroup .tpo-btn');
    tpoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.getAttribute('data-tpo');
            if (state.selectedTpoProfileLevel === level) {
                state.selectedTpoProfileLevel = 'none';
            } else {
                state.selectedTpoProfileLevel = level;
            }
            updateChartData();
        });
    });

    // Handle Volume Profile toolbar
    const vpGroup = document.getElementById('chartVpGroup');
    const vpToggle = document.getElementById('vpToggle');
    let vpExpanded = false;

    if (vpToggle && vpGroup) {
        vpToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            vpExpanded = !vpExpanded;
            vpGroup.classList.toggle('expanded', vpExpanded);
            vpToggle.textContent = vpExpanded ? '\u00ab' : '\u00bb';
        });

        vpGroup.addEventListener('mouseleave', () => {
            if (vpExpanded) {
                vpExpanded = false;
                vpGroup.classList.remove('expanded');
                vpToggle.textContent = '\u00bb';
            }
        });
    }

    const vpButtons = document.querySelectorAll('#chartVpGroup .vp-btn');
    vpButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.getAttribute('data-vp');
            if (state.selectedVolumeProfileLevel === level) {
                state.selectedVolumeProfileLevel = 'none';
            } else {
                state.selectedVolumeProfileLevel = level;
            }
            updateChartData();
        });
    });

    // Populate initial data to chart
    updateChartData();
    updateSidebarWidget();
}

function updateChartData() {
    if (!window.activeChart) return;
    
    const baseCode = state.activeContract;
    const contract = state.contracts[baseCode];
    const dataContainer = state.futuresData[baseCode];
    
    if (!dataContainer) return;
    
    let dataset = [];
    if (state.chartPeriod === 'D') {
        dataset = dataContainer.daily;
    } else if (state.chartPeriod === '15M') {
        dataset = dataContainer.min15 || [];
    } else if (state.chartPeriod === '30M') {
        dataset = dataContainer.min30 || [];
    } else if (state.chartPeriod === '60M') {
        dataset = dataContainer.min60 || [];
    } else if (state.chartPeriod === 'W') {
        dataset = compressToWeekly(dataContainer.daily);
    } else if (state.chartPeriod === 'Month') {
        dataset = compressToMonthly(dataContainer.daily);
    }
    
    // Display actual contract symbol (from metadata, e.g. CU2609) or base code
    const displaySym = contract.symbol || baseCode;
    const oiInfo = contract.oiAnalysis ? `当下持仓量: ${(contract.oiAnalysis.currentOI/10000).toFixed(1)}万手 · 峰值持仓量: ${(contract.oiAnalysis.historicalMaxOI/10000).toFixed(1)}万手` : (contract.openInterest ? `持仓量: ${(contract.openInterest/10000).toFixed(1)}万手` : '');
    document.getElementById('chartActiveTitle').innerHTML = `${contract.name}<br><span style="font-size: 0.95rem; color: var(--text-secondary); font-weight: 500;">(${displaySym})</span>`;
    document.getElementById('chartActiveSubtitle').textContent = oiInfo;
    
    // Configure TPO and Volume Profiles on chart
    window.activeChart.symbol = baseCode;
    window.activeChart.setProfileLevels(state.selectedTpoProfileLevel, state.selectedVolumeProfileLevel);
    window.activeChart.setIntradayData({
        bars1m: dataContainer.min1 || [],
        bars5m: dataContainer.min5 || [],
        bars15m: dataContainer.min15 || [],
        bars30m: dataContainer.min30 || [],
        bars60m: dataContainer.min60 || [],
        dailyDates: (dataContainer.daily || []).map(d => d.date)
    });
    
    window.activeChart.chartPeriod = state.chartPeriod;
    window.activeChart.setData(dataset);
    
    updateProfileAvailabilityPanel();
    syncProfileButtons();
}

function updateProfileAvailabilityPanel() {
    const baseCode = state.activeContract;
    const dataContainer = state.futuresData[baseCode];
    const panel = document.getElementById('profileLimitsPanel');
    if (!panel || !dataContainer) return;
    
    const bars30m = dataContainer.min30 || [];
    const bars1m = dataContainer.min1 || [];
    const bars5m = dataContainer.min5 || [];
    const dailyDates = (dataContainer.daily || []).map(d => d.date);
    
    const tpoStart = getEarliestTradingDate(bars30m, dailyDates);
    const vp1mStart = getEarliestTradingDate(bars1m, dailyDates);
    const vp5mStart = getEarliestTradingDate(bars5m, dailyDates);
    
    const limitTpoInfo = document.getElementById('limitTpoInfo');
    const limitVpInfo = document.getElementById('limitVpInfo');
    
    if (tpoStart && tpoStart !== "无数据") {
        if (limitTpoInfo) {
            limitTpoInfo.textContent = `TPO 可用起点: ${tpoStart} 至今`;
            limitTpoInfo.style.display = 'inline-flex';
        }
    } else {
        if (limitTpoInfo) limitTpoInfo.style.display = 'none';
    }
    
    if ((vp1mStart && vp1mStart !== "无数据") || (vp5mStart && vp5mStart !== "无数据")) {
        if (limitVpInfo) {
            let vpText = "VP 可用起点: ";
            const parts = [];
            if (vp1mStart && vp1mStart !== "无数据") parts.push(`1m: ${vp1mStart}`);
            if (vp5mStart && vp5mStart !== "无数据") parts.push(`5m: ${vp5mStart}`);
            vpText += parts.join(" / ") + " 至今";
            limitVpInfo.textContent = vpText;
            limitVpInfo.style.display = 'inline-flex';
        }
    } else {
        if (limitVpInfo) limitVpInfo.style.display = 'none';
    }
    
    const hasTpo = tpoStart && tpoStart !== "无数据";
    const hasVp = (vp1mStart && vp1mStart !== "无数据") || (vp5mStart && vp5mStart !== "无0数据" && vp5mStart !== "无数据");
    
    if (hasTpo || hasVp) {
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

// Compress Daily datasets to Weekly aggregates
function compressToWeekly(dailyData) {
    if (!dailyData || !dailyData.length) return [];
    
    const weekly = [];
    let currentWeek = [];
    
    dailyData.forEach((day, index) => {
        const dateObj = new Date(day.date);
        currentWeek.push(day);
        
        // Friday is index 5 or if next date belongs to another week, wrap up
        const isFriday = dateObj.getDay() === 5;
        const isLastItem = index === dailyData.length - 1;
        
        let shouldWrap = isFriday || isLastItem;
        
        if (!shouldWrap && !isLastItem) {
            const nextDateObj = new Date(dailyData[index + 1].date);
            const currentWeekNum = getWeekNumber(dateObj);
            const nextWeekNum = getWeekNumber(nextDateObj);
            if (currentWeekNum !== nextWeekNum) {
                shouldWrap = true;
            }
        }
        
        if (shouldWrap) {
            const wOpen = currentWeek[0].open;
            const wClose = currentWeek[currentWeek.length - 1].close;
            const wHigh = Math.max(...currentWeek.map(d => d.high));
            const wLow = Math.min(...currentWeek.map(d => d.low));
            const wVol = currentWeek.reduce((sum, d) => sum + d.volume, 0);
            const wHold = currentWeek[currentWeek.length - 1].hold;
            
            weekly.push({
                date: currentWeek[currentWeek.length - 1].date,
                open: wOpen,
                high: wHigh,
                low: wLow,
                close: wClose,
                volume: wVol,
                hold: wHold
            });
            
            currentWeek = [];
        }
    });
    
    return weekly;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return d.getUTCFullYear() + '-' + weekNo;
}

// Compress Daily datasets to Monthly aggregates
function compressToMonthly(dailyData) {
    if (!dailyData || !dailyData.length) return [];

    const monthly = [];
    let currentMonth = [];
    let prevMonthKey = null;

    dailyData.forEach((day, index) => {
        const dateObj = new Date(day.date);
        const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
        const isLastItem = index === dailyData.length - 1;

        if (prevMonthKey !== null && monthKey !== prevMonthKey && currentMonth.length > 0) {
            // Wrap up previous month
            const mOpen  = currentMonth[0].open;
            const mClose = currentMonth[currentMonth.length - 1].close;
            const mHigh  = Math.max(...currentMonth.map(d => d.high));
            const mLow   = Math.min(...currentMonth.map(d => d.low));
            const mVol   = currentMonth.reduce((s, d) => s + d.volume, 0);
            const mHold  = currentMonth[currentMonth.length - 1].hold;
            monthly.push({
                date:   currentMonth[currentMonth.length - 1].date,
                open:   mOpen, high: mHigh, low: mLow, close: mClose,
                volume: mVol,  hold: mHold
            });
            currentMonth = [];
        }

        currentMonth.push(day);
        prevMonthKey = monthKey;

        if (isLastItem && currentMonth.length > 0) {
            const mOpen  = currentMonth[0].open;
            const mClose = currentMonth[currentMonth.length - 1].close;
            const mHigh  = Math.max(...currentMonth.map(d => d.high));
            const mLow   = Math.min(...currentMonth.map(d => d.low));
            const mVol   = currentMonth.reduce((s, d) => s + d.volume, 0);
            const mHold  = currentMonth[currentMonth.length - 1].hold;
            monthly.push({
                date:   currentMonth[currentMonth.length - 1].date,
                open:   mOpen, high: mHigh, low: mLow, close: mClose,
                volume: mVol,  hold: mHold
            });
        }
    });

    return monthly;
}

// Update Analysis and Stats Sidebar Panels
function updateSidebarWidget() {
    const baseCode = state.activeContract;
    const contract = state.contracts[baseCode];
    const dataContainer = state.futuresData[baseCode];
    if (!dataContainer) return;
    const dataList = dataContainer.daily;
    if (!dataList || !dataList.length) return;
    
    const last = dataList[dataList.length - 1];
    
    // 1. Basic Stats updates (check if elements exist)
    const statClosePrice = document.getElementById('statClosePrice');
    if (statClosePrice) statClosePrice.textContent = last.close.toFixed(1);
    
    const statVolume = document.getElementById('statVolume');
    if (statVolume) statVolume.textContent = window.activeChart.formatVolume(last.volume);
    
    const statHold = document.getElementById('statHold');
    if (statHold) statHold.textContent = window.activeChart.formatVolume(last.hold);
    
    const marginHand = last.close * contract.multiplier * contract.marginRate;
    const statMarginValue = document.getElementById('statMarginValue');
    if (statMarginValue) statMarginValue.textContent = `¥${marginHand.toFixed(0)}`;
    
    // 2. Mock term structure (basis curves)
    const structureBarContainer = document.getElementById('termStructureGraph');
    if (structureBarContainer) {
        structureBarContainer.innerHTML = '';
        
        // Generate pseudo curves for near month, main, and far month
        const base = last.close;
        const labels = ['07合约', '09合约(主)', '11合约', '01合约'];
        
        // Define if it is Contango (ascending) or Backwardation (descending) based on base code seed
        const isBack = baseCode.charCodeAt(0) % 2 === 0; 
        const slope = isBack ? -0.015 : 0.012;
        
        labels.forEach((lbl, idx) => {
            const priceFactor = 1 + (idx - 1) * slope + (Math.random() - 0.5) * 0.002;
            const priceVal = base * priceFactor;
            
            const col = document.createElement('div');
            col.className = 'term-bar-col';
            
            // Normalize heights (min height 20%, max height 90%)
            const heightPercent = 20 + 70 * (priceFactor - (1 - 2*Math.abs(slope))) / (4*Math.abs(slope));
            
            col.innerHTML = `
                <div class="term-bar" style="height: ${Math.max(10, Math.min(100, heightPercent))}%" title="预估价: ${priceVal.toFixed(1)}"></div>
                <span class="term-label">${lbl}</span>
            `;
            structureBarContainer.appendChild(col);
        });
        
        const termStatus = document.getElementById('termStructureStatus');
        if (termStatus) {
            termStatus.textContent = isBack ? '期限结构：贴水 (Backwardation) 远月贴水' : '期限结构：升水 (Contango) 远月升水';
            termStatus.className = isBack ? 'stats-value price-up' : 'stats-value price-down';
        }
    }
    
    // 3. CTA Technical Signals computations (moving averages based)
    const signalBadge = document.getElementById('statCtaSignal');
    if (signalBadge) {
        const ma5 = last.ma5;
        const ma20 = last.ma20;
        
        if (ma5 && ma20) {
            if (last.close > ma5 && ma5 > ma20) {
                signalBadge.textContent = '看多 (Bullish)';
                signalBadge.className = 'signal-badge signal-buy';
            } else if (last.close < ma5 && ma5 < ma20) {
                signalBadge.textContent = '看空 (Bearish)';
                signalBadge.className = 'signal-badge signal-sell';
            } else {
                signalBadge.textContent = '中性 (Neutral)';
                signalBadge.className = 'signal-badge signal-neutral';
            }
        } else {
            signalBadge.textContent = '计算中';
            signalBadge.className = 'signal-badge signal-neutral';
        }
    }
}

// Live simulated price variation timer
let liveTickerInterval;
function startLiveTickerTimer() {
    if (liveTickerInterval) clearInterval(liveTickerInterval);
    
    liveTickerInterval = setInterval(() => {
        if (state.activeTab !== 'dashboard') return;
        
        // Randomly choose 1-2 contracts to update on this tick
        const baseCodes = Object.keys(state.contracts);
        const countToUpdate = Math.floor(Math.random() * 2) + 1;
        
        for (let k = 0; k < countToUpdate; k++) {
            const sym = baseCodes[Math.floor(Math.random() * baseCodes.length)];
            const contract = state.contracts[sym];
            const dataContainer = state.futuresData[sym];
            
            if (!dataContainer || !dataContainer.daily.length) continue;
            
            // Modify current day close price slightly
            const daily = dataContainer.daily;
            const lastIdx = daily.length - 1;
            const last = daily[lastIdx];
            const prev = daily[lastIdx - 1] || last;
            
            const volatility = sym === 'AU' ? 0.0006 : sym === 'CU' ? 0.001 : 0.0015;
            const tickChange = (Math.random() - 0.5) * 2 * volatility;
            
            // Apply price limits (approx. index tracking limits)
            last.close = parseFloat((last.close * (1 + tickChange)).toFixed(1));
            if (last.close > last.high) last.high = last.close;
            if (last.close < last.low) last.low = last.close;
            
            // Randomly increase trade volume on each tick
            last.volume += Math.round(Math.random() * 25);
            
            // Update 15M last minute close as well
            if (dataContainer.min15 && dataContainer.min15.length) {
                const minList = dataContainer.min15;
                const lastMin = minList[minList.length - 1];
                lastMin.close = last.close;
                if (lastMin.close > lastMin.high) lastMin.high = lastMin.close;
                if (lastMin.close < lastMin.low) lastMin.low = lastMin.close;
                lastMin.volume += Math.round(Math.random() * 10);
            }
            
            // Update Card Tickers UI values (by base code)
            const priceEl = document.getElementById(`price-${sym}`);
            const changeEl = document.getElementById(`change-${sym}`);
            
            if (priceEl && changeEl) {
                priceEl.textContent = last.close.toFixed(1);
                
                const diff = last.close - prev.close;
                const pct = (diff / prev.close) * 100;
                const isUp = diff >= 0;
                const sign = isUp ? '+' : '';
                
                priceEl.className = `ticker-price ${isUp ? 'price-up' : 'price-down'}`;
                changeEl.className = `ticker-change ${isUp ? 'price-up' : 'price-down'}`;
                changeEl.innerHTML = `
                    <span>${sign}${diff.toFixed(1)}</span>
                    <span>${sign}${pct.toFixed(2)}%</span>
                `;
            }
            
            // Flash active contract card border subtle effect
            const cardEl = document.getElementById(`ticker-${sym}`);
            if (cardEl) {
                cardEl.style.boxShadow = `0 0 16px ${last.close >= prev.close ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`;
                setTimeout(() => {
                    cardEl.style.boxShadow = '';
                }, 400);
            }
            
            // Redraw chart canvas if the active contract is updated
            if (sym === state.activeContract && window.activeChart) {
                updateChartData();
                updateSidebarWidget();
            }
        }
    }, 1800);
}

// Interactive macro variables slider simulator
function startStatsSimulation() {
    if (state.isDataReal) return; // Disable simulation in real data mode
    setInterval(() => {
        // Slow variations in aggregate open interest
        if (state.activeTab !== 'dashboard') return;
        const sym = state.activeContract;
        const daily = state.futuresData[sym]?.daily;
        if (!daily || !daily.length) return;
        const last = daily[daily.length - 1];
        last.hold += Math.round((Math.random() - 0.5) * 100);
        
        const statHold = document.getElementById('statHold');
        if (statHold) statHold.textContent = window.activeChart.formatVolume(last.hold);
    }, 5000);
}

// ==========================================================================
/* INVESTMENT ARTICLES BLOG MODULE */
// ==========================================================================

function initArticleSection() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    
    renderArticles('all');
    
    // Category tabs filter hooks
    const filterButtons = document.querySelectorAll('#categoryFilterToolbar .category-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.getAttribute('data-category');
            renderArticles(cat);
        });
    });

    // Setup Inline Modal Close hooks
    const closeBtn = document.getElementById('readerCloseBtn');
    const overlay = document.getElementById('readerOverlay');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeArticleReader);
    }
    
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeArticleReader();
            }
        });
        
        // Track scroll inside reader overlay to update the reading progress bar
        overlay.addEventListener('scroll', () => {
            const scrollTop = overlay.scrollTop;
            const containerHeight = document.getElementById('readerContainer').offsetHeight;
            const viewportHeight = window.innerHeight;
            
            const progress = (scrollTop / (containerHeight - viewportHeight + 100)) * 100;
            const bar = document.getElementById('readerProgressBar');
            if (bar) {
                bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
        });
    }
    
    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
            closeArticleReader();
        }
    });
}

function renderArticles(category) {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const filtered = category === 'all' ? articles : articles.filter(a => a.category === category);
    
    if (!filtered.length) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem 0;">暂无该类别文章</div>`;
        return;
    }
    
    filtered.forEach(art => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
            <div class="article-card-media">
                <span class="article-category-badge">${art.categoryName}</span>
                <i class="lucide-book-open" style="font-size: 3rem; opacity: 0.15;"></i>
            </div>
            <div class="article-card-content">
                <div class="article-card-meta">
                    <span>${art.date}</span>
                    <span>·</span>
                    <span>阅读 ${art.readTime}</span>
                </div>
                <h3 class="article-card-title">${art.title}</h3>
                <p class="article-card-excerpt">${art.excerpt}</p>
                <div class="article-card-footer">
                    <div class="author-info">
                        <span class="author-avatar">${art.avatar}</span>
                        <span>${art.author}</span>
                    </div>
                    <span class="read-more-link">阅读全文 <i class="lucide-arrow-right"></i></span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openArticleReader(art);
        });
        
        grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}

function openArticleReader(article) {
    const overlay = document.getElementById('readerOverlay');
    
    document.getElementById('readerCategory').textContent = article.categoryName;
    document.getElementById('readerTitle').textContent = article.title;
    document.getElementById('readerDate').textContent = article.date;
    document.getElementById('readerReadTime').textContent = `阅读时长约: ${article.readTime}`;
    document.getElementById('readerAuthor').textContent = article.author;
    document.getElementById('readerAuthorAvatar').textContent = article.avatar;
    document.getElementById('readerBody').innerHTML = article.content;
    
    // Lock outer body scrolling
    document.body.style.overflow = 'hidden';
    
    overlay.classList.add('active');
    overlay.scrollTop = 0;
    
    const bar = document.getElementById('readerProgressBar');
    if (bar) bar.style.width = '0%';

    if (window.lucide) window.lucide.createIcons();
}

function closeArticleReader() {
    const overlay = document.getElementById('readerOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==========================================================================
/* TECHNICAL ANOMALY UI BUILDER */
// ==========================================================================

function buildTechnicalUI(data) {
    const meta = data.metadata;
    if (!meta) return;

    // 1. Scan badge
    const scanStatus = document.getElementById('techScanStatus');
    if (scanStatus) {
        scanStatus.textContent = `扫描完成: ${meta.sync_time ? new Date(meta.sync_time).toLocaleString() : ''} | 基于上一交易日收盘数据 · 发现 ${meta.anomalies.length} 个异动`;
        scanStatus.parentElement.style.color = meta.anomalies.length > 0 ? "var(--primary)" : "var(--text-muted)";
    }

    // 2. Populate Screening Table
    const tbody = document.getElementById('techScreeningBody');
    const subtitle = document.getElementById('techScreeningSubtitle');
    if (tbody && meta.screening) {
        subtitle.textContent = `覆盖品种: ${Object.keys(meta.screening).length}`;
        tbody.innerHTML = '';
        
        // Sort screening results by oiRatio descending
        const allScreening = Object.values(meta.screening).sort((a, b) => b.oiRatio - a.oiRatio);
        
        allScreening.forEach(s => {
            const tr = document.createElement('tr');
            if (s.alert === 'new_high') tr.className = 'row-anomaly row-new-high';
            else if (s.alert === 'near_high') tr.className = 'row-anomaly row-near-high';
            
            let statusHtml = '<span style="color:var(--text-muted)">正常</span>';
            if (s.alert === 'new_high') statusHtml = '<span class="oi-badge oi-badge-new-high">创新高</span>';
            else if (s.alert === 'near_high') statusHtml = '<span class="oi-badge oi-badge-near-high">近历史高</span>';
            
            const fillWidth = Math.min(100, s.oiRatio * 100);
            let fillColor = 'var(--text-muted)';
            if (s.alert === 'new_high') fillColor = '#ef4444';
            else if (s.alert === 'near_high') fillColor = '#f59e0b';
            
            tr.innerHTML = `
                <td><strong>${s.name}</strong> (${s.code})</td>
                <td>${s.exchange}</td>
                <td>${(s.currentOI/10000).toFixed(1)}万手</td>
                <td>${(s.historicalMaxOI/10000).toFixed(1)}万手</td>
                <td>${s.historicalMaxDate}</td>
                <td>
                    <div class="ratio-bar-wrap">
                        <span style="width: 38px; font-weight: 600; color: ${fillColor}">${(s.oiRatio*100).toFixed(1)}%</span>
                        <div class="ratio-bar-bg"><div class="ratio-bar-fill" style="width: ${fillWidth}%; background-color: ${fillColor};"></div></div>
                    </div>
                </td>
                <td>${statusHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // 3. Anomaly Cards (placeholder for future analysis)
    const cardsContainer = document.getElementById('techAnomalyCards');
    if (cardsContainer) {
        if (!meta.anomalies || meta.anomalies.length === 0) {
            cardsContainer.innerHTML = `
                <div class="tech-empty-state">
                    <div class="tech-empty-radar">
                        <div class="tech-empty-radar-dot"></div>
                    </div>
                    <h3>今日暂无技术异动标的</h3>
                    <p>市场看板监控显示，当前所有品种主力合约的持仓量均未达到历史峰值的90%。请等待下个交易日的全市场扫描更新。</p>
                </div>
            `;
            return;
        }
        
        cardsContainer.innerHTML = '<div class="anomaly-cards-grid"></div>';
        const grid = cardsContainer.querySelector('.anomaly-cards-grid');
        
        meta.anomalies.forEach(code => {
            const contract = meta.contracts[code];
            if (!contract) return;
            const oi = contract.oiAnalysis;
            const isNewHigh = oi.alert === 'new_high';
            const badgeClass = isNewHigh ? 'oi-badge-new-high' : 'oi-badge-near-high';
            const badgeText = isNewHigh ? 'OI创新高' : 'OI近历史高';
            const cardClass = isNewHigh ? 'card-new-high' : 'card-near-high';
            const fillClass = isNewHigh ? 'fill-new-high' : 'fill-near-high';
            const fillWidth = Math.min(100, oi.oiRatio * 100);
            
            grid.innerHTML += `
                <div class="anomaly-card ${cardClass}">
                    <div class="anomaly-card-header">
                        <div class="anomaly-card-header-left">
                            <h3>${contract.name}</h3>
                            <div class="card-meta">${contract.symbol} · ${contract.exchange}</div>
                        </div>
                        <span class="oi-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    
                    <div class="anomaly-card-stats">
                        <div class="anomaly-stat">
                            <span class="anomaly-stat-label">当前总持仓</span>
                            <span class="anomaly-stat-value">${(oi.currentOI/10000).toFixed(1)}万手</span>
                        </div>
                        <div class="anomaly-stat">
                            <span class="anomaly-stat-label">历史单日峰值</span>
                            <span class="anomaly-stat-value">${(oi.historicalMaxOI/10000).toFixed(1)}万手</span>
                        </div>
                        <div class="anomaly-stat" style="grid-column: 1/-1;">
                            <span class="anomaly-stat-label">历史峰值日期</span>
                            <span class="anomaly-stat-value" style="font-size: 0.85rem;">${oi.historicalMaxDate}</span>
                        </div>
                    </div>
                    
                    <div class="anomaly-oi-bar">
                        <div class="anomaly-oi-bar-label">
                            <span>持仓量攀升进度</span>
                            <span style="font-weight: 700; color: ${isNewHigh ? '#ef4444' : '#f59e0b'}">${(oi.oiRatio*100).toFixed(1)}%</span>
                        </div>
                        <div class="anomaly-oi-bar-bg">
                            <div class="anomaly-oi-bar-fill ${fillClass}" style="width: ${fillWidth}%"></div>
                        </div>
                    </div>
                    
                    <div class="anomaly-analysis-placeholder">
                        <i data-lucide="line-chart"></i>
                        量化异动分析模块
                        <span class="anomaly-placeholder-coming">可留白待开发</span>
                    </div>
                    
                    <div class="anomaly-card-footer">
                        <button class="btn-view-chart" onclick="switchTab('dashboard'); selectContract('${code}')">
                            <i data-lucide="activity"></i> 在看板中深度分析
                        </button>
                    </div>
                </div>
            `;
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

function syncProfileButtons() {
    const tpoGroup = document.getElementById('chartTpoGroup');
    const tpoButtons = document.querySelectorAll('#chartTpoGroup .tpo-btn');
    if (tpoGroup) {
        let hasActive = false;
        tpoButtons.forEach(btn => {
            const level = btn.getAttribute('data-tpo');
            if (state.selectedTpoProfileLevel === level) {
                btn.classList.add('active');
                hasActive = true;
            } else {
                btn.classList.remove('active');
            }
        });
        if (hasActive) {
            tpoGroup.classList.add('has-active');
        } else {
            tpoGroup.classList.remove('has-active');
        }
    }

    const vpGroup = document.getElementById('chartVpGroup');
    const vpButtons = document.querySelectorAll('#chartVpGroup .vp-btn');
    if (vpGroup) {
        let hasActive = false;
        vpButtons.forEach(btn => {
            const level = btn.getAttribute('data-vp');
            if (state.selectedVolumeProfileLevel === level) {
                btn.classList.add('active');
                hasActive = true;
            } else {
                btn.classList.remove('active');
            }
        });
        if (hasActive) {
            vpGroup.classList.add('has-active');
        } else {
            vpGroup.classList.remove('has-active');
        }
    }
}
