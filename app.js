/* ==========================================================================
   CENTRAL SPA APPLICATION CONTROLLER & LOGIC (personal-investment-site/app.js)
   ========================================================================== */


// Global Application State
const state = {
    theme: 'dark',
    activeTab: 'dashboard',
    contracts: {
        'AU2606': { name: '沪金主力', symbol: 'AU2606', exchange: 'SHFE', basePrice: 550, multiplier: 1000, marginRate: 0.08, unit: '克' },
        'CU2607': { name: '沪铜主力', symbol: 'CU2607', exchange: 'SHFE', basePrice: 72000, multiplier: 5, marginRate: 0.10, unit: '吨' },
        'RB2610': { name: '螺纹钢主力', symbol: 'RB2610', exchange: 'SHFE', basePrice: 3400, multiplier: 10, marginRate: 0.09, unit: '吨' },
        'SC2607': { name: '原油主力', symbol: 'SC2607', exchange: 'INE', basePrice: 600, multiplier: 1000, marginRate: 0.11, unit: '桶' },
        'SR2609': { name: '白糖主力', symbol: 'SR2609', exchange: 'CZCE', basePrice: 6200, multiplier: 10, marginRate: 0.07, unit: '吨' },
        'TA2609': { name: 'PTA主力', symbol: 'TA2609', exchange: 'CZCE', basePrice: 5800, multiplier: 5, marginRate: 0.08, unit: '吨' }
    },
    activeContract: 'CU2607',
    chartPeriod: 'D', // 'D' (日K), 'W' (周K), '15M' (15分钟)
    isDataReal: false,
    futuresData: {}, // Holds real or simulated data for each contract
    realDataLoadError: false
};

// Custom articles database
const articles = [
    {
        id: 1,
        title: "全球流动性拐点与大宗商品周期的宏观展望",
        category: "macro",
        categoryName: "宏观研究",
        date: "2026-05-15",
        readTime: "8 分钟",
        excerpt: "随着主要央行货币政策从高利率维持转入降息周期，以及全球地缘政治与产业链重构的深远背景，全球流动性正迎来拐点。本文探讨该拐点对大宗商品（黄金、有色、原油）长周期走势的传导机制与核心逻辑。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 在过去的十年中，全球经济经历了从量化宽松到激进加息的剧烈波动。2026年，随着主要央行（尤其是美联储与欧洲央行）确认通胀率向2%目标收敛，全球货币政策从“更高更久”向“渐进宽松”的流动性拐点已然成型。这一流动性周期的切换，往往是商品大周期启动的前奏。</p>
            
            <h2>一、 流动性拐点对大宗商品的双重传导机制</h2>
            <p>流动性对商品价格的影响主要通过两个渠道展开：<strong>金融属性（计价货币效应）</strong>与<strong>实体属性（信用扩张与需求提振）</strong>。</p>
            <blockquote>
                “大宗商品作为硬通货，其价格波动的本质是其与信用纸币相对购买力的博弈。”
            </blockquote>
            <p>1. <strong>美元信用与名义价格：</strong> 全球大宗商品主要以美元计价。美联储启动降息直接促使美元指数走弱，对于持有非美货币的买家而言，商品名义价格相对下降，从而提振全球购买需求。同时，降息导致持有无息资产（如黄金）的机会成本下降，金融溢价随之抬升。</p>
            <p>2. <strong>利率下调与工业需求：</strong> 降息将逐步传导至实体信贷市场。资金成本降低有利于终端行业（建筑、电网、新能源、汽车）进行补库，从而改善供需关系。以沪铜为例，电力网络改造和新能源车用铜需求本身处于高位，一旦资金约束放开，基本面对价格的弹性将大幅增加。</p>

            <h2>二、 不同板块商品的强弱分化与配置逻辑</h2>
            <p>虽然流动性普遍利好商品，但在周期的不同阶段，各板块的表现存在显著分化：</p>
            
            <h3>1. 贵金属（黄金/白银）：周期的先行指标</h3>
            <p>黄金受名义利率与通胀预期之差（即实际利率）的驱动最为明显。在降息周期的初期，利率快速下行而通胀尚未完全下陷时，实际利率低企是黄金价格最强的助推器。此外，地缘博弈和全球央行“去美元化”储备多元化是支撑金价中枢上移的长期因子。</p>

            <h3>2. 有色金属（铜/铝）：宏观与供给的双重共振</h3>
            <p>以电解铜为代表的有色金属是流动性传导至工业需求的最佳载体。除金融溢价外，铜正面临全球性矿端供给收缩、冶炼产能受限的困境。新能源发电与AI数据中心对铜缆的刚性需求，使其在流动性转暖时具备极佳的爆发力。</p>

            <h3>3. 能化与黑色（原油/螺纹钢）：供需与逆周期政策的博弈</h3>
            <p>原油受地缘风险溢价及OPEC+供给管理主导，波动更多取决于微观供需平衡。而国内黑色系（如螺纹钢）则与中国本土的基建及逆周期调控政策深度绑定。在房地产增速放缓的背景下，螺纹钢正从传统的“高增长投资驱动”转为“低库存弹性震荡”状态，流动性提振主要表现在资金面预期好转，而非需求立刻暴增。</p>

            <h2>三、 个人投资者的配置建议</h2>
            <p>对于个人投资者，大宗商品是防范法币长期贬值与滞胀风险的天然工具：</p>
            <ul>
                <li><strong>资产配置比例：</strong> 建议在传统的股债投资组合中加入 10% - 15% 的商品资产（可采用黄金ETF、商品LOF或期货工具）。</li>
                <li><strong>交易时机：</strong> 关注美债十年期实际收益率的下行斜率，在实际利率拐头向下时做多黄金；在主要经济体制造业PMI重回扩张区间时做多铜等基本金属。</li>
                <li><strong>风险防控：</strong> 商品交易具备高杠杆和强波动性，切忌追涨杀跌，应通过控制头寸（如单笔风险不超过账户总资产的1%）防范市场异常波动。</li>
            </ul>
        `
    },
    {
        id: 2,
        title: "CTA趋势跟踪策略在商品期货交易中的系统化构建与回撤控制",
        category: "futures",
        categoryName: "商品交易",
        date: "2026-05-28",
        readTime: "12 分钟",
        excerpt: "商品期货天生具备高杠杆和双向交易机制，是趋势跟踪（CTA）策略的乐园。本文将深入讲解如何利用双均线和通道突破系统构建一个极简但稳健的CTA策略，并重点剖析如何通过多品种分散和动态仓位控制回撤。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 许多投资者将商品期货视为高风险的赌场。然而，如果能脱离主观情绪，运用系统化的趋势跟踪策略，商品期货其实是一个极佳的阿尔法（Alpha）来源。本文将解构一个可在实盘中运行的经典CTA策略架构。</p>

            <h2>一、 趋势跟踪策略的哲学底座</h2>
            <p>趋势跟踪（Trend Following）的核心前提是：<strong>市场在某些时间段内会呈现出方向性的持续运动（牛市或熊市），且这种状态会维持比常人预期更长的时间。</strong></p>
            <p>我们的原则是：</p>
            <blockquote>
                “不预测市场方向，不预设顶部与底部；只做趋势的发现者、跟随者与收割者。”
            </blockquote>
            <p>这意味着，我们甘愿放弃趋势初期的利润（等待确认），也会回撤趋势末端的利润（等待止损）。我们通过“截断亏损，让利润奔跑”这一不对称的盈亏分布获取长期正向期望值。</p>

            <h2>二、 系统构建：经典双均线交叉与突破系统</h2>
            <p>这里介绍一个简单而有效的日K线级别系统框架：</p>

            <h3>1. 趋势过滤（长均线）与入场信号（短均线）</h3>
            <p>我们采用 <strong>EMA20</strong> 和 <strong>EMA60</strong> 的金叉/死叉作为基础信号：</p>
            <ul>
                <li><strong>多头入场：</strong> 当日收盘价高于 EMA60，且 EMA20 向上金叉 EMA60。</li>
                <li><strong>空头入场：</strong> 当日收盘价低于 EMA60，且 EMA20 向下死叉 EMA60。</li>
            </ul>

            <h3>2. 出场与止损（ATR通道）</h3>
            <p>单凭价格交叉容易被频繁的“震荡噪声”磨损。我们引入 <strong>ATR（平均真实波幅）</strong> 进行动态止损：</p>
            <ul>
                <li><strong>初始止损（硬止损）：</strong> 入场价格 &plusmn; 2 &times; ATR。</li>
                <li><strong>追踪止损（移动止损）：</strong> 以持有期内的最高/最低收盘价为基准，当价格反向回撤超过 3 &times; ATR 时，无条件离场，锁死浮盈。</li>
            </ul>

            <h2>三、 核心挑战：如何平滑震荡市的“千刀之痛”？</h2>
            <p>趋势跟踪最大的软肋是震荡市（Whipsaw）。市场有 70% 的时间处于无趋势状态，此时策略会不断发出买卖信号并触发小幅割肉。要控制这个阶段的回撤，必须做好三件事：</p>

            <h3>1. 多品种分散（Multi-Asset Diversification）</h3>
            <p>绝不要重仓单一品种！应该选择相关性低的商品组合。例如：</p>
            <p><strong>沪金 (AU)</strong> [避险/利率驱动] + <strong>沪铜 (CU)</strong> [工业实体] + <strong>螺纹钢 (RB)</strong> [国内基建] + <strong>白糖 (SR)</strong> [农产品天气驱动]。</p>
            <p>当螺纹钢在区间震荡亏钱时，白糖可能因为减产大涨，黄金可能因为降息大涨。组合层面的低相关性是唯一的免费午餐。</p>

            <h3>2. 基于波动的风险价值（Volatility Targeting）</h3>
            <p>商品期货的波动率每天都在改变。我们的仓位计算绝不能一成不变，而应使每个品种分配相同的<strong>风险贡献</strong>：</p>
            <p><code>单品种头寸 = (账户总资产 × 1%) / (单笔止损点数 × 合约乘数)</code></p>
            <p>这保证了无论是高波动的原油，还是低波动的白糖，在触发止损时，对总账户的杀伤力都是完全一致的（都是1%）。</p>

            <h3>3. 严格的知行合一</h3>
            <p>系统化交易最难的部分不是写出代码，而是在连续遭遇 5 次、8 次震荡止损后，依然能够平静地执行第 9 次入场信号。大多数人在黎明破晓前放弃，而趋势往往在放弃后的第一天爆发。</p>
        `
    },
    {
        id: 3,
        title: "现代组合理论下的中国商品期货配置价值",
        category: "allocation",
        categoryName: "资产配置",
        date: "2026-06-02",
        readTime: "10 分钟",
        excerpt: "在传统的『股债双债』体系中，加入大宗商品期货不仅能提升组合的抗通胀能力，更能通过其与股债资产的极低相关性，显著提高马科维茨有效前沿的夏普比率。本文利用历史回测数据，解析商品期货在组合层面的平滑价值。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 2026年的市场环境进一步印证了传统资产定价的脆弱性。股债双杀的场景在过去几年频频出现。在这种背景下，寻求与传统股债资产低相关（甚至负相关）的替代性资产，是构建抗脆弱资产配置组合的当务之急。</p>

            <h2>一、 中国商品期货与其他资产的相关性矩阵</h2>
            <p>我们分析了近十年来，中证商品期货指数与沪深300指数（代表A股）、中债综合指数（代表债市）的日收盘相关系数。结果令人振奋：</p>
            <blockquote>
                - 商品指数与沪深300的相关性常年维持在 <strong>-0.08 至 +0.15</strong> 之间。<br>
                - 商品指数与中债指数的相关性在 <strong>-0.12 至 +0.05</strong> 之间。
            </blockquote>
            <p>这表明，大宗商品的价格波动与股票收益率基本脱钩。这种极低的相关性并非偶然，因为商品由实物供需驱动，股票由企业盈利与估值驱动，而债券由名义利率与信用风险驱动。它们的定价逻辑是完全并行的系统。</p>

            <h2>二、 马科维茨有效前沿的移动实验</h2>
            <p>我们可以构建三个模拟组合来直观体现其配置价值：</p>
            
            <h3>1. 组合A（传统股债组合）</h3>
            <p>配置比例：60% 股（沪深300） + 40% 债（中债综指）。<br>
            近十年的年化收益率约为 5.2%，最大回撤 16.4%，夏普比率 0.45。</p>

            <h3>2. 组合B（加入商品配置）</h3>
            <p>配置比例：50% 股 + 30% 债 + 20% 商品期货多头（均权重分散于黄金、沪铜、螺纹钢、白糖）。<br>
            近十年年化收益率提升至 6.8%，<strong>最大回撤缩窄至 11.2%</strong>，夏普比率提升至 0.72。</p>
            
            <p><strong>分析：</strong> 尽管商品期货本身波动很大，但当以20%的比例融入组合时，其与股票的负相关特征在股市大跌（如2022年、2024年）中起到了极佳的对冲垫底作用，不仅提高了收益率，更大幅度削减了整体风险。</p>

            <h2>三、 如何规避期货展期损耗（Roll Yield）？</h2>
            <p>虽然期货是极佳的配置工具，但它与股票不同：期货合约有到期日。长期持有期货多头必须面对“展期”问题：</p>
            <ul>
                <li><strong>贴水结构（Backwardation）：</strong> 远月合约价格低于近月合约。当合约临近到期，将近月平仓并买入较便宜的远月时，会获得正的展期收益。这在大宗商品偏紧俏（如近年来的铜、原油）时非常常见。</li>
                <li><strong>升水结构（Contango）：</strong> 远月合约价格高于近月。展期时需要“低卖高买”，形成展期损耗。这在供给过剩或持有成本极高的品种中常见。</li>
            </ul>
            <p><strong>实操策略：</strong> 个人做资产配置时，应优先配置处于 <strong>Backwardation（近高远低）</strong> 期限结构中的商品品种，这不仅能享受价格上涨的红利，还能平稳赚取时间的展期收益（Roll Yield）。</p>
        `
    }
];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRouting();
    initArticleSection();
    initCalculator();
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
async function loadFuturesData() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const syncTimeText = document.getElementById('syncTime');
    
    try {
        statusText.textContent = "正在检测数据...";
        // Try fetching synced data from the local data directory
        const response = await fetch('./data/futures_data.json');
        if (!response.ok) {
            throw new Error("File not found");
        }
        const data = await response.json();
        
        // Data parsed successfully! Update state
        state.isDataReal = true;
        state.futuresData = data;
        
        statusDot.className = 'status-dot synced';
        statusText.textContent = "真实数据同步";
        
        // Show sync time
        if (data.metadata && data.metadata.sync_time) {
            const date = new Date(data.metadata.sync_time);
            syncTimeText.textContent = `数据更新时间: ${date.toLocaleString()}`;
        }
        
    } catch (err) {
        console.warn("未检测到真实同步的期货数据文件 (data/futures_data.json) 或读取失败，将启用高仿真行情演算系统。", err);
        // Fallback to simulation mode
        state.isDataReal = false;
        generateMockData();
        
        statusDot.className = 'status-dot active';
        statusText.textContent = "行情模拟模式";
        syncTimeText.textContent = "数据已同步接入实时行情演算器";
        
        // Start real-time simulated price tick variations
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
    
    Object.keys(state.contracts).forEach(symbol => {
        const contract = state.contracts[symbol];
        const dataList = [];
        let price = contract.basePrice;
        const volatility = symbol.startsWith('AU') ? 0.006 : symbol.startsWith('CU') ? 0.009 : 0.012; // Gold has lower vol than rebar/sugar
        
        // Generate 120 historical days
        for (let i = 120; i >= 0; i--) {
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
            const baseVol = symbol.startsWith('AU') ? 80000 : symbol.startsWith('CU') ? 150000 : 800000;
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
        
        state.futuresData[symbol] = {
            daily: dataList,
            // 15 Minutes (generate 40 bars for intraday)
            min15: generateMinuteData(price, volatility * 0.4, 40)
        };
    });
}

function generateMinuteData(basePrice, volatility, numBars) {
    const dataList = [];
    let price = basePrice;
    const now = new Date();
    
    for (let i = numBars; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 15 * 60 * 1000);
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
    
    Object.keys(state.contracts).forEach(symbol => {
        const contract = state.contracts[symbol];
        const data = state.futuresData[symbol].daily;
        if (!data || !data.length) return;
        
        const lastDay = data[data.length - 1];
        const prevDay = data[data.length - 2] || lastDay;
        
        const dailyChange = lastDay.close - prevDay.close;
        const dailyChangePct = (dailyChange / prevDay.close) * 100;
        
        const isUp = dailyChange >= 0;
        const colorClass = isUp ? 'price-up' : 'price-down';
        const sign = isUp ? '+' : '';
        
        const card = document.createElement('div');
        card.className = `ticker-card ${symbol === state.activeContract ? 'active' : ''}`;
        card.id = `ticker-${symbol}`;
        card.innerHTML = `
            <div class="ticker-card-header">
                <div>
                    <span class="ticker-name">${contract.name}</span>
                    <span class="ticker-symbol">${symbol}</span>
                </div>
                <span class="ticker-exchange">${contract.exchange}</span>
            </div>
            <div class="ticker-price ${colorClass}" id="price-${symbol}">${lastDay.close.toFixed(1)}</div>
            <div class="ticker-change ${colorClass}" id="change-${symbol}">
                <span>${sign}${dailyChange.toFixed(1)}</span>
                <span>${sign}${dailyChangePct.toFixed(2)}%</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectContract(symbol);
        });
        
        scrollContainer.appendChild(card);
    });
}

// Update Active Contract Selection
function selectContract(symbol) {
    if (state.activeContract === symbol) return;
    
    // Toggle active classes in ticker list
    const prevActiveCard = document.getElementById(`ticker-${state.activeContract}`);
    if (prevActiveCard) prevActiveCard.classList.remove('active');
    
    state.activeContract = symbol;
    
    const activeCard = document.getElementById(`ticker-${symbol}`);
    if (activeCard) activeCard.classList.add('active');
    
    // Rerender Chart & stats panels
    updateChartData();
    updateSidebarWidget();
}

// Chart Components Hooks
function initializeChartComponent() {
    window.activeChart = new FuturesChart('futuresChart');
    
    // Handle chart period change tabs
    const periodButtons = document.querySelectorAll('#chartPeriodToolbar .btn-tab');
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.chartPeriod = btn.getAttribute('data-period');
            updateChartData();
        });
    });

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

    // Handle indicators toggles
    const ma5Btn = document.getElementById('indicatorMA5');
    const ma10Btn = document.getElementById('indicatorMA10');
    const ma20Btn = document.getElementById('indicatorMA20');
    const volBtn = document.getElementById('indicatorVolume');

    const handleIndicatorToggle = (btn, indicator) => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            window.activeChart.toggleIndicator(indicator);
        });
    };

    if (ma5Btn) handleIndicatorToggle(ma5Btn, 'ma5');
    if (ma10Btn) handleIndicatorToggle(ma10Btn, 'ma10');
    if (ma20Btn) handleIndicatorToggle(ma20Btn, 'ma20');
    if (volBtn) handleIndicatorToggle(volBtn, 'volume');

    // Populate initial data to chart
    updateChartData();
    updateSidebarWidget();
}

function updateChartData() {
    if (!window.activeChart) return;
    
    const contract = state.contracts[state.activeContract];
    const dataContainer = state.futuresData[state.activeContract];
    
    let dataset = [];
    if (state.chartPeriod === 'D') {
        dataset = dataContainer.daily;
    } else if (state.chartPeriod === '15M') {
        dataset = dataContainer.min15;
    } else if (state.chartPeriod === 'W') {
        // Group daily into weekly candles
        dataset = compressToWeekly(dataContainer.daily);
    }
    
    // Set title info on chart UI
    document.getElementById('chartActiveTitle').textContent = `${contract.name} (${contract.symbol})`;
    document.getElementById('chartActiveSubtitle').textContent = `${contract.exchange} · 乘数: ${contract.multiplier} ${contract.unit}/手 · 保证金: ${(contract.marginRate*100).toFixed(0)}%`;
    
    window.activeChart.setData(dataset);
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

// Update Analysis and Stats Sidebar Panels
function updateSidebarWidget() {
    const symbol = state.activeContract;
    const contract = state.contracts[symbol];
    const dataList = state.futuresData[symbol].daily;
    if (!dataList || !dataList.length) return;
    
    const last = dataList[dataList.length - 1];
    
    // 1. Basic Stats updates
    document.getElementById('statClosePrice').textContent = last.close.toFixed(1);
    document.getElementById('statVolume').textContent = window.activeChart.formatVolume(last.volume);
    document.getElementById('statHold').textContent = window.activeChart.formatVolume(last.hold);
    
    const marginHand = last.close * contract.multiplier * contract.marginRate;
    document.getElementById('statMarginValue').textContent = `¥${marginHand.toFixed(0)}`;
    
    // 2. Mock term structure (basis curves)
    const structureBarContainer = document.getElementById('termStructureGraph');
    if (structureBarContainer) {
        structureBarContainer.innerHTML = '';
        
        // Generate pseudo curves for near month, main, and far month
        const base = last.close;
        const labels = ['07合约', '09合约(主)', '11合约', '01合约'];
        
        // Define if it is Contango (ascending) or Backwardation (descending) based on symbol seed
        const isBack = symbol.charCodeAt(0) % 2 === 0; 
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
        
        document.getElementById('termStructureStatus').textContent = isBack ? '期限结构：贴水 (Backwardation) 远月贴水' : '期限结构：升水 (Contango) 远月升水';
        document.getElementById('termStructureStatus').className = isBack ? 'stats-value price-up' : 'stats-value price-down';
    }
    
    // 3. CTA Technical Signals computations (moving averages based)
    const signalBadge = document.getElementById('statCtaSignal');
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

// Live simulated price variation timer
let liveTickerInterval;
function startLiveTickerTimer() {
    if (liveTickerInterval) clearInterval(liveTickerInterval);
    
    liveTickerInterval = setInterval(() => {
        if (state.activeTab !== 'dashboard') return;
        
        // Randomly choose 1-2 contracts to update on this tick
        const symbols = Object.keys(state.contracts);
        const countToUpdate = Math.floor(Math.random() * 2) + 1;
        
        for (let k = 0; k < countToUpdate; k++) {
            const sym = symbols[Math.floor(Math.random() * symbols.length)];
            const contract = state.contracts[sym];
            const dataContainer = state.futuresData[sym];
            
            if (!dataContainer || !dataContainer.daily.length) continue;
            
            // Modify current day close price slightly
            const daily = dataContainer.daily;
            const lastIdx = daily.length - 1;
            const last = daily[lastIdx];
            const prev = daily[lastIdx - 1] || last;
            
            const volatility = sym.startsWith('AU') ? 0.0006 : sym.startsWith('CU') ? 0.001 : 0.0015;
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
            
            // Update Card Tickers UI values
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
    setInterval(() => {
        // Slow variations in aggregate open interest
        if (state.activeTab !== 'dashboard') return;
        const sym = state.activeContract;
        const daily = state.futuresData[sym]?.daily;
        if (!daily || !daily.length) return;
        const last = daily[daily.length - 1];
        last.hold += Math.round((Math.random() - 0.5) * 100);
        document.getElementById('statHold').textContent = window.activeChart.formatVolume(last.hold);
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
/* FUTURES RISK & MARGIN CALCULATOR MODULE */
// ==========================================================================

function initCalculator() {
    // Collect DOM Elements
    const totalCapitalInput = document.getElementById('calcTotalCapital');
    const riskRatioInput = document.getElementById('calcRiskRatio');
    const contractPriceInput = document.getElementById('calcContractPrice');
    const multiplierInput = document.getElementById('calcMultiplier');
    const marginRateInput = document.getElementById('calcMarginRate');
    const stopLossInput = document.getElementById('calcStopLoss');
    
    const riskRatioSlider = document.getElementById('calcRiskRatioSlider');
    const marginRateSlider = document.getElementById('calcMarginRateSlider');

    const longBtn = document.getElementById('calcDirectionLong');
    const shortBtn = document.getElementById('calcDirectionShort');
    
    let direction = 'long'; // 'long' or 'short'

    if (!totalCapitalInput) return; // safeguard

    // Bind slider & numeric input syncs
    riskRatioSlider.addEventListener('input', () => {
        riskRatioInput.value = riskRatioSlider.value;
        calculateCalculatorResults();
    });
    
    riskRatioInput.addEventListener('input', () => {
        riskRatioSlider.value = riskRatioInput.value;
        calculateCalculatorResults();
    });
    
    marginRateSlider.addEventListener('input', () => {
        marginRateInput.value = marginRateSlider.value;
        calculateCalculatorResults();
    });
    
    marginRateInput.addEventListener('input', () => {
        marginRateSlider.value = marginRateInput.value;
        calculateCalculatorResults();
    });

    // Direction Selectors
    longBtn.addEventListener('click', () => {
        longBtn.classList.add('active');
        shortBtn.classList.remove('active');
        direction = 'long';
        calculateCalculatorResults();
    });

    shortBtn.addEventListener('click', () => {
        shortBtn.classList.add('active');
        longBtn.classList.remove('active');
        direction = 'short';
        calculateCalculatorResults();
    });

    // Populate active pricing values from dashboard state into calculator
    const quickLoadPricingBtn = document.getElementById('calcLoadActiveMarket');
    if (quickLoadPricingBtn) {
        quickLoadPricingBtn.addEventListener('click', () => {
            const sym = state.activeContract;
            const contract = state.contracts[sym];
            const daily = state.futuresData[sym].daily;
            if (!contract || !daily.length) return;
            
            const last = daily[daily.length - 1];
            
            contractPriceInput.value = last.close.toFixed(1);
            multiplierInput.value = contract.multiplier;
            marginRateInput.value = (contract.marginRate * 100).toFixed(0);
            marginRateSlider.value = (contract.marginRate * 100).toFixed(0);
            
            // Set stop loss dot default: 1% of index price
            stopLossInput.value = Math.round(last.close * 0.012);
            
            calculateCalculatorResults();
        });
    }

    // Input changes triggers recalculation
    [totalCapitalInput, contractPriceInput, multiplierInput, stopLossInput].forEach(inp => {
        inp.addEventListener('input', calculateCalculatorResults);
    });

    // Quick init calculations
    setTimeout(() => {
        if (quickLoadPricingBtn) quickLoadPricingBtn.click();
    }, 100);

    function calculateCalculatorResults() {
        // Parsings
        const cap = parseFloat(totalCapitalInput.value) || 0;
        const riskPct = parseFloat(riskRatioInput.value) || 0;
        const price = parseFloat(contractPriceInput.value) || 0;
        const mult = parseFloat(multiplierInput.value) || 0;
        const marginPct = (parseFloat(marginRateInput.value) || 0) / 100;
        const stopLossPoints = parseFloat(stopLossInput.value) || 0;

        if (cap <= 0 || price <= 0 || mult <= 0 || stopLossPoints <= 0) {
            updateCalculatorUI({ lots: 0, marginUsed: 0, marginRatio: 0, leverage: 0, maxLoss: 0, stopLossPrice: 0, riskLevel: 'low' });
            return;
        }

        // 1. Target stop loss price based on direction
        let stopLossPrice = 0;
        if (direction === 'long') {
            stopLossPrice = price - stopLossPoints;
        } else {
            stopLossPrice = price + stopLossPoints;
        }

        // 2. Risk budgeting: max budget allowed to lose in RMB
        const maxLoss = cap * (riskPct / 100);

        // 3. Loss per lot = stopLossPoints * multiplier
        const lossPerLot = stopLossPoints * mult;

        // 4. Maximum hand lots we can trade: Max budget / Loss per lot
        let lots = Math.floor(maxLoss / lossPerLot);
        if (lots < 0) lots = 0;

        // 5. Margin required for the recommended lots
        const nominalValuePerLot = price * mult;
        const marginPerLot = nominalValuePerLot * marginPct;
        const marginUsed = lots * marginPerLot;

        // 6. Leverage of recommended position: Nominal value / Account Capital
        const nominalValueTotal = lots * nominalValuePerLot;
        const leverage = cap > 0 ? (nominalValueTotal / cap) : 0;

        // 7. Margin utilization percentage
        const marginRatio = cap > 0 ? (marginUsed / cap) * 100 : 0;

        // Risk Level checks
        let riskLevel = 'low'; // safe
        if (leverage > 8 || marginRatio > 60) {
            riskLevel = 'high';
        } else if (leverage > 4 || marginRatio > 35) {
            riskLevel = 'medium';
        }

        updateCalculatorUI({
            lots,
            marginUsed,
            marginRatio,
            leverage,
            maxLoss,
            stopLossPrice,
            riskLevel
        });
    }

    function updateCalculatorUI(res) {
        document.getElementById('calcResultLots').textContent = res.lots;
        document.getElementById('calcResultMargin').textContent = `¥${Math.round(res.marginUsed).toLocaleString()}`;
        document.getElementById('calcResultMarginRatio').textContent = `${res.marginRatio.toFixed(1)}%`;
        document.getElementById('calcResultLeverage').textContent = `${res.leverage.toFixed(2)}x`;
        document.getElementById('calcResultMaxLoss').textContent = `¥${Math.round(res.maxLoss).toLocaleString()}`;
        
        const slPriceText = res.stopLossPrice > 0 ? res.stopLossPrice.toFixed(1) : '--';
        document.getElementById('calcResultStopLossPrice').textContent = slPriceText;

        // Update Risk Bar Indicator
        const bar = document.getElementById('calcRiskBarFill');
        const text = document.getElementById('calcRiskLabelText');
        
        if (!bar || !text) return;

        let width = '0%';
        let color = '#10b981'; // Green
        let statusText = '极安全';

        if (res.lots > 0) {
            if (res.riskLevel === 'high') {
                width = '90%';
                color = '#ef4444'; // Red
                statusText = '超高风险 (谨防爆仓！)';
            } else if (res.riskLevel === 'medium') {
                width = '55%';
                color = '#f59e0b'; // Orange/Amber
                statusText = '中度风险 (注意波动)';
            } else {
                width = '25%';
                color = '#10b981'; // Green
                statusText = '低风险 (理性仓位)';
            }
        }

        bar.style.width = width;
        bar.style.backgroundColor = color;
        text.textContent = statusText;
        text.style.color = color;
    }
}
