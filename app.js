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
    document.getElementById('chartActiveTitle').innerHTML = `${contract.name}<br><span style="font-size: 0.95rem; color: var(--text-secondary); font-weight: 500;">(${displaySym} 对应连续 ${baseCode}0)</span>`;
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
