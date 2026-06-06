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
        title: "支撑位的贝叶斯：价格条件如何改变上行概率",
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
                P(价格 &gt; 1400  |  这周) = 20%
            </div>
            <div class="math-block">
                P(价格 &gt; 1500  |  这周) = 2%
            </div>
            
            <p><strong>求解目标：</strong></p>
            <p>在价格成功守住 1400（即 <span class="math-inline">价格 &gt; 1400</span>）的条件下，本周价格能进一步突破 1500 的条件概率：</p>
            <div class="math-block">
                P(价格 &gt; 1500  |  价格 &gt; 1400, 这周)
            </div>
            
            <p><strong>事件设定：</strong></p>
            <ul>
                <li>设 <span class="math-inline">A = {价格 &gt; 1400}</span> 为价格位于 1400 之上的事件</li>
                <li>设 <span class="math-inline">B = {价格 &gt; 1500}</span> 为价格位于 1500 之上的事件</li>
                <li>设 <span class="math-inline">W = {这周}</span> 为本周这一观察时间窗口</li>
            </ul>
            
            <p>由于价格只要位于 1500 之上，就必然位于 1400 之上，因此存在包含关系：</p>
            <div class="math-block">
                B ⊂ A
            </div>
            
            <h2>二、 公式推导过程</h2>
            <p>根据条件概率的基本公式：</p>
            <div class="math-block">
                P(B  |  A, W) = <div class="math-fraction"><span class="math-numerator">P(B, A, W)</span><span class="math-denominator">P(A, W)</span></div>
            </div>
            
            <p>又因为 <span class="math-inline">B ⊂ A</span>，所以联合事件 <span class="math-inline">P(B, A, W)</span> 可以简化为：</p>
            <div class="math-block">
                P(B, A, W) = P(B, W)
            </div>
            
            <p>将其带回原式，我们得到：</p>
            <div class="math-block">
                P(B  |  A, W) = <div class="math-fraction"><span class="math-numerator">P(B, W)</span><span class="math-denominator">P(A, W)</span></div>
            </div>
            
            <p>进一步展开为关于时间的条件概率：</p>
            <div class="math-block">
                P(B  |  A, W) = <div class="math-fraction"><span class="math-numerator">P(B  |  W) P(W)</span><span class="math-denominator">P(A  |  W) P(W)</span></div>
            </div>
            
            <p>由于在此我们讨论的基准时间段就是本周，因此 <span class="math-inline">P(W) = 1</span>，分子分母的 <span class="math-inline">P(W)</span> 相互抵消，得到最终模型：</p>
            <div class="math-block">
                P(B  |  A, W) = <div class="math-fraction"><span class="math-numerator">P(B  |  W)</span><span class="math-denominator">P(A  |  W)</span></div>
            </div>
            
            <p><strong>代入数据计算：</strong></p>
            <div class="math-block">
                P(价格 &gt; 1500  |  价格 &gt; 1400, 这周) = <div class="math-fraction"><span class="math-numerator">2%</span><span class="math-denominator">20%</span></div> = 10%
            </div>
            
            <h2>三、 贝叶斯视角下的交易思考</h2>
            <p>也就是说，在仅考虑“这周”这一时间背景时，价格能够触及 1500 之上的无条件概率只有 <strong>2%</strong>；但如果行情演进并进一步证实了“价格已经位于 1400 之上”这一前置条件，则进一步上行至 1500 的条件概率直接上升至 <strong>10%</strong>。</p>
            
            <p>这说明，<strong>支撑位的意义并不在于它必然推动价格上涨，而在于它改变了我们观察市场的样本空间。</strong></p>
            
            <p>两者的核心区别在于：</p>
            <ul>
                <li><strong>无条件问题：</strong> <span class="math-inline">P(价格 &gt; 1500  |  这周)</span> —— “这周价格涨到 1500 之上的概率是多少”。</li>
                <li><strong>条件问题：</strong> <span class="math-inline">P(价格 &gt; 1500  |  价格 &gt; 1400, 这周)</span> —— “如果价格守住 1400，那么它进一步涨到 1500 之上的概率是多少”。</li>
            </ul>
            
            <p>后者排除了跌破 1400 的弱势运行路径，只在“价格仍处于 1400 上方”的子样本空间中重新进行概率计算。因此， 1500 的上行概率从 2% 提升到 10%，相当于<strong>提高了 5 倍</strong>。</p>
            
            <h2>四、 结论与实盘警示</h2>
            <p>但这并不意味着交易上可以简单得出“只要在 1400 做多即可”的盲目结论。因为：</p>
            <div class="math-block">
                P(价格 &gt; 1400  |  这周) = 20%
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
        id: 2,
        title: "趋势的博弈：大级别趋势确立后的行为金融推导",
        category: "essays",
        categoryName: "投资随笔",
        date: "2026-06-06",
        readTime: "10 分钟",
        excerpt: "大级别趋势一旦经过充分博弈确立后，价格为什么往往难以快速反转？本文构建了一个简化群体行为模型，深度解析场内多头赢家、空头输家与场外资金在大趋势下的行为金融博弈动力学。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 在大级别的趋势行情中，价格一旦越过某个激烈博弈的临界点，往往会展现出极强的方向惯性。这种惯性真的是因为资金无穷无尽吗？本文通过构建一个将市场资金人格化、单位化的简化群体行为模型，从理性与非理性博弈的视角，推导大级别趋势确立后的行为金融动力学逻辑。</p>
            
            <h2>一、 前提假设</h2>
            <p>本文讨论的是一个已经经过充分博弈后的趋势市场，而不是普通震荡行情。我们设定以下前提假设：</p>
            <ul>
                <li>多头大级别趋势已经在激烈博弈后确立；</li>
                <li>九成以上资金已经沉淀在市场中；</li>
                <li>理性人占总人群比例极低，假设为 <strong>0.2%</strong>；</li>
                <li>绝大多数参与者受人性驱动，包括贪婪、恐惧、亏损厌恶、锚定成本、侥幸心理与趋势追随。</li>
            </ul>
            <p>其中，理性人占比 0.2% 并不是为了夸大趋势延续结论，反而是一个偏保守的模型设定。</p>
            <p>在本文前提下，即大级别多头趋势已经被市场确认、趋势结构尚未被破坏、价格尚未达到目标预期，且风险收益仍然支持顺势参与时，理性人比例越高，越会强化顺趋势行为：理性多头更倾向于持有或加仓，理性空头更倾向于平仓止损，理性场外资金更倾向于顺势参与。因此，在上述条件成立时，理性人比例上升并不会削弱本文结论，反而会提高边际买盘 <span class="math-inline">Q<sub>L</sub></span>，使趋势延续的概率更高。</p>
            <p>换言之，0.2% 是一个保守假设。即使严格理性参与者极少，趋势确认后的仓位结构与人性行为仍可能推动趋势延续；若严格理性参与者占比更高，在趋势未被破坏、价格尚未到达目标区间、且风险收益仍支持顺势参与的条件下，趋势延续的结论反而更强。反之，如果趋势确认失败、价格已经明显脱离合理区间，或风险收益不再支持顺势参与，理性人比例提高反而可能更早推动止盈、减仓或反向交易。</p>
            <p>在这个框架下，当前价格为 <strong>1400</strong>。场内存在两类主要参与者：</p>
            <ul>
                <li><strong>多头赢家：</strong> 平均成本 1350，当前浮盈，目标预期 1600；</li>
                <li><strong>空头输家：</strong> 平均成本位于 1350–1400，当前浮亏，平仓预期 1400。</li>
            </ul>
            <p>场外还存在尚未参与或准备参与的潜在资金。</p>
            <blockquote>
                “当大级别多头趋势已经确立，且场内资金高度沉淀后，价格为什么往往难以快速反转？”
            </blockquote>
            <p>需要先说明的是，本文中的“10000 位多头赢家”“10000 位空头输家”并不是对真实账户数量的精确描述，而是为了推导方便，将场内多空两侧仓位进行人格化、单位化后的简化表达。</p>
            <p>在真实期货市场中，多空持仓量必然配对，但多空账户人数不一定相等。一个大户可能对应多个小户，多个小户也可能对应一个大户。因此，本文后续使用人数 <span class="math-inline">N</span> 进行推导，本质上只是对群体行为和边际力量的简化表达。真正决定价格变化的，不是人数本身，而是<strong>边际买盘与边际卖盘的强弱</strong>。</p>
            
            <h2>二、 符号说明</h2>
            <p>设基本行为分类：</p>
            <ul>
                <li><span class="math-inline">L</span>：做多、加多，或形成买盘的行为；</li>
                <li><span class="math-inline">S</span>：做空、加空，或形成卖盘的行为；</li>
                <li><span class="math-inline">w</span>：观望、持有、扛单等暂时不主动改变方向的行为。</li>
            </ul>
            <p>进一步区分决策分支：</p>
            <ul>
                <li><span class="math-inline">L<sup>+</sup></span>：多头赢家加仓，形成边际买盘；</li>
                <li><span class="math-inline">w<sup>+</sup></span>：多头赢家继续持有，不直接形成新的主动卖压；</li>
                <li><span class="math-inline">T<sup>+</sup></span>：多头赢家止盈平仓，形成边际卖盘；</li>
                <li><span class="math-inline">R<sup>+</sup></span>：多头赢家反手做空，形成更强边际卖盘；</li>
                <li><span class="math-inline">L<sup>-</sup></span>：空头输家平仓止损，本质上是买回空单，形成边际买盘；</li>
                <li><span class="math-inline">w<sup>-</sup></span>：空头输家继续扛单，短期不形成主动买盘，但保留潜在止损买盘；</li>
                <li><span class="math-inline">S<sup>-</sup></span>：空头输家继续加空，形成边际卖盘。</li>
            </ul>
            <p>其中：</p>
            <ul>
                <li><span class="math-inline">P(L)</span>、<span class="math-inline">P(S)</span>、<span class="math-inline">P(w)</span> 表示某类群体选择对应行为的概率，也可以近似理解为该群体中选择该行为的比例；</li>
                <li><span class="math-inline">N(L)</span>、<span class="math-inline">N(S)</span>、<span class="math-inline">N(w)</span> 表示对应行为的预期人数；</li>
                <li><span class="math-inline">Q<sub>L</sub></span> 表示多头加仓、空头平仓、场外做多等行为形成的边际买盘；</li>
                <li><span class="math-inline">Q<sub>S</sub></span> 表示多头止盈、反手做空、空头加仓、场外做空等行为形成的边际卖盘。</li>
            </ul>
            <p>真正决定价格方向的是：</p>
            <div class="math-block">
                Q<sub>L</sub> &nbsp;vs&nbsp; Q<sub>S</sub>
            </div>
            <p><strong>情景推演逻辑：</strong></p>
            <ul>
                <li>若 <span class="math-inline">Q<sub>L</sub> &nbsp;&gt;&nbsp; Q<sub>S</sub></span>，则价格倾向于继续上行；</li>
                <li>若 <span class="math-inline">Q<sub>L</sub> &nbsp;&lt;&nbsp; Q<sub>S</sub></span>，则价格容易出现回调或反转；</li>
                <li>若 <span class="math-inline">Q<sub>L</sub> &nbsp;≈&nbsp; Q<sub>S</sub></span>，则价格更容易进入震荡或高位分歧状态。</li>
            </ul>
            <blockquote>
                “人数优势只有在能够转化为有效订单优势时，才会推动价格变化。”
            </blockquote>
            
            <h2>三、 场内多头赢家的行为</h2>
            <p>当前价格为 1400。场内有 10000 位多头赢家，平均成本为 1350，已经处于浮盈状态，目标预期为 1600。</p>
            <h3>1. 理性多头赢家</h3>
            <p>理性人占比为 0.2%，所以在 10000 位多头赢家中，理性多头约为：</p>
            <div class="math-block">
                10000 × 0.2% = 20
            </div>
            <p>在大级别多头趋势已经确立、价格尚未达到目标预期 1600、且风险收益仍可接受的情况下，理性多头更倾向于顺势加仓或继续持有，而不是反手做空。为了保持原推导框架，本文在简化模型中设定理性多头选择加仓：</p>
            <div class="math-block">
                P(L<sup>+</sup>) = 1, P(w<sup>+</sup>) = P(T<sup>+</sup>) = P(R<sup>+</sup>) = 0
            </div>
            <p>调整后，理性多头预期人数如下：</p>
            <div class="math-block">
                N(L<sup>+</sup>) = 20, N(T<sup>+</sup>) + N(R<sup>+</sup>) = 0
            </div>
            <blockquote>
                “在趋势确认且目标尚未到达时，理性多头把浮盈视为趋势确认后的顺势优势，而不是立即离场的理由。”
            </blockquote>
            <p>需要注意的是，这里的设定是简化模型，在真实交易中，理性人仍可能因为波动率、仓位约束、盈亏比变化、基本面变化或流动性风险而选择观望或减仓。</p>
            
            <h3>2. 非完全理性多头赢家</h3>
            <p>剩余 9980 位多头赢家属于非完全理性参与者. 他们已经浮盈，因此其主要行为受两种人性驱动：<strong>贪婪</strong>（希望价格继续上涨至 1600）与<strong>持仓锚定</strong>（既然已经盈利，倾向于继续持有或加仓，而不是马上反向做空）。</p>
            <p>非完全理性多头的选择可以表示为集合：<span class="math-inline">C<sup>+</sup> = (L<sup>+</sup>, w<sup>+</sup>, T<sup>+</sup>, R<sup>+</sup>)</span>。</p>
            <p>在趋势刚刚确立、价格尚未到达 1600 的条件下，非完全理性多头大概率不会立刻大规模反手做空，因此：</p>
            <div class="math-block">
                P(R<sup>+</sup>) &nbsp;≈&nbsp; 0
            </div>
            <p>但这并不意味着多头完全没有止盈卖压。多头止盈平仓 <span class="math-inline">T<sup>+</sup></span> 是真实存在的，只是在本文设定的阶段中，由于价格距离目标预期 1600 仍有空间，且趋势刚刚确立，止盈卖压暂时不是主要力量。自然，可近似写成：</p>
            <div class="math-block">
                P(L<sup>+</sup>) + P(w<sup>+</sup>) + P(T<sup>+</sup>) &nbsp;≈&nbsp; 1
            </div>
            <p>且在趋势确认初期：</p>
            <div class="math-block">
                P(T<sup>+</sup>) &nbsp;&lt;&nbsp; P(L<sup>+</sup>) + P(w<sup>+</sup>)
            </div>
            <p>也就是说，多头赢家整体仍以持有或加仓为主，止盈为辅。我们将主要行为简化为 <span class="math-inline">P(L<sup>+</sup>) + P(w<sup>+</sup>)</span> 占主导，对应三种主要情况：</p>
            <ul>
                <li><strong>情况 1：</strong> <span class="math-inline">P(L<sup>+</sup>) &nbsp;&lt;&nbsp; P(w<sup>+</sup>)</span> —— 多数多头选择继续持有，少数多头选择加仓。</li>
                <li><strong>情况 2：</strong> <span class="math-inline">P(L<sup>+</sup>) = P(w<sup>+</sup>)</span> —— 选择加仓和继续持有的人数大致相当。</li>
                <li><strong>情况 3：</strong> <span class="math-inline">P(L<sup>+</sup>) &nbsp;&gt;&nbsp; P(w<sup>+</sup>)</span> —— 多数多头选择继续加仓，少数多头选择持有。</li>
            </ul>
            <p>在大级别多头趋势已经确立，且市场资金高度沉淀的前提下，非完全理性多头大概率位于情况 1 或情况 3。也就是说，多头赢家整体仍表现为<strong>持有锁仓 + 部分加仓 - 少量止盈</strong>的净多头态势，不容易成为趋势反转的主导力量。</p>
            
            <h2>四、 场内空头输家的行为</h2>
            <p>场内还有 10000 位空头输家，平均成本位于 1350–1400。当前价格为 1400，空头已经处于浮亏或接近浮亏状态，平仓预期锚定在 1400 附近。</p>
            <h3>1. 理性空头输家</h3>
            <p>10000 位空头中，理性空头约为：</p>
            <div class="math-block">
                10000 × 0.2% = 20
            </div>
            <p>在多头大级别趋势确立的情况下，理性空头会承认趋势不利，选择平仓止损。空头平仓的本质是买回空单，因此对市场形成主动买盘。设定理性空头行为为：</p>
            <div class="math-block">
                P(L<sup>-</sup>) = 1, P(w<sup>-</sup>) = P(S<sup>-</sup>) = 0
            </div>
            <p>因此人数为：</p>
            <div class="math-block">
                N(L<sup>-</sup>) = 20, N(S<sup>-</sup>) = 0
            </div>
            <blockquote>
                “理性空头在趋势已经被确认后，不再把 1400 当作必然回本点，而是选择止损离场。”
            </blockquote>
            
            <h3>2. 非完全理性空头输家</h3>
            <p>剩余 9980 位空头属于非完全理性参与者。他们受<strong>亏损厌恶</strong>、<strong>成本锚定</strong>（认为价格会回踩成本区）与<strong>侥幸心理</strong>（希望等回落再平仓）影响，在趋势刚确认且价格尚未明显远离其成本区间时，不愿主动止损：</p>
            <div class="math-block">
                P(L<sup>-</sup>) &nbsp;≈&nbsp; 0
            </div>
            <p>他们主要在继续扛单 and 继续加空之间选择，满足：<span class="math-inline">P(w<sup>-</sup>) + P(S<sup>-</sup>) &nbsp;≈&nbsp; 1</span>，对应三种情况：</p>
            <ul>
                <li><strong>情况 1：</strong> <span class="math-inline">P(S<sup>-</sup>) &nbsp;&lt;&nbsp; P(w<sup>-</sup>)</span> —— 多数空头选择继续扛单，少数空头选择加空。</li>
                <li><strong>情况 2：</strong> <span class="math-inline">P(S<sup>-</sup>) = P(w<sup>-</sup>)</span> —— 继续扛单和继续加空的人数大致相当。</li>
                <li><strong>情况 3：</strong> <span class="math-inline">P(S<sup>-</sup>) &nbsp;&gt;&nbsp; P(w<sup>-</sup>)</span> —— 多数空头选择继续加空，少数空头选择扛单。</li>
            </ul>
            <p>在大级别多头趋势确立初期，非完全理性空头大概率为<strong>情况 1</strong>：多数选择扛单，少数选择加空。这表明：<strong>非完全理性空头短期内不一定立即贡献买盘，但他们构成了未来潜在的止损买盘。</strong></p>
            <p>当价格继续上行时，空头亏损扩大，保证金压力与心理压力直线上升，其主动或被迫止损的概率会随之增加（即 <span class="math-inline">P(L<sup>-</sup>) ↑</span>）。因此，空头在上涨过程中极易转化为趋势延续的燃料。</p>
            
            <h2>五、 场外资金的行为</h2>
            <p>场外有 1000 位潜在参与者。其中理性人占 0.2%，即 2 位；非完全理性人为 998 位。在资金高度沉淀（九成资金在场内）的市场结构中，后续趋势方向取决于边际订单（Marginal Orders）的强弱：</p>
            <div class="math-block">
                高沉淀资金本身不是方向，而是趋势放大器
            </div>
            
            <h3>1. 场外理性人</h3>
            <p>在大级别多头趋势已经确立、空头输家仍有潜在止损压力的背景下，理性场外资金倾向于顺势追随做多：</p>
            <div class="math-block">
                P(L) = 1, P(w) = P(S) = 0 ⇒ N(L) = 2
            </div>
            
            <h3>2. 场外非完全理性人</h3>
            <p>场外非完全理性资金是趋势能否从场内博弈扩散为市场共识的关键变量。因此，需要先完整枚举其可能行为状态，再判断在本文前提下哪一种状态最可能出现。</p>
            <p>剩余 998 位场外参与者，其选择为：<span class="math-inline">P(L) + P(S) + P(w) = 1</span>，他们的参与方向可以表示为做多与做空的对比（存在九种多空组合情况）。</p>
            <p>在多头大级别趋势确立、赚钱效应扩散的条件下，场外非完全理性资金大概率处于<strong>做多人数多于做空人数，且积极参与的黄金状态</strong>（即 <span class="math-inline">P(L) + P(S) &nbsp;&gt;&nbsp; P(w)</span> 且 <span class="math-inline">P(L) &nbsp;&gt;&nbsp; P(S)</span>）。这就是趋势向场外扩散的阶段。</p>
            
            <h2>六、 场内外合并后的边际力量</h2>
            <p>市场合并后的边际力量对比：</p>
            <ul>
                <li><strong>边际买盘力量：</strong> 场内多头继续加仓 + 场内空头平仓止损 + 场外资金顺势追多；</li>
                <li><strong>边际卖盘力量：</strong> 场内多头部分止盈 + 场内空头继续加空 + 场外逆势做空。</li>
            </ul>
            <p>趋势能够延续的本质，在于总边际买盘能够压倒总边际卖盘，即：</p>
            <div class="math-block">
                Q<sub>L</sub> &nbsp;&gt;&nbsp; Q<sub>S</sub>
            </div>
            
            <h2>七、 结论情景一：趋势强延续</h2>
            <p>在空头未成多数加空（<span class="math-inline">0 &nbsp;&lt;&nbsp; N(S<sup>-</sup>) &nbsp;&lt;&nbsp; 4990</span>）、场内多头大比例加仓（<span class="math-inline">N(L<sup>+</sup>) &nbsp;&gt;&nbsp; 4990</span>）的条件下，叠加理性人的行为偏向，我们可以得到核心顺势买盘的保守下限：</p>
            <div class="math-block">
                N(L<sup>*</sup>)<sub>core</sub> &nbsp;&gt;&nbsp; 4990 + 20 + 2 = 5012
            </div>
            <p>这个 5012 尚未计入空头被迫爆仓平仓买盘 and 场外其他追随资金。若此核心买盘成功转化为订单优势，且卖压没有异常放大，则 <span class="math-inline">Q<sub>L</sub> &nbsp;&gt;&nbsp; Q<sub>S</sub></span> 强力成立，<strong>趋势将大概率强劲延续，价格继续上行</strong>。</p>
            
            <h2>八、 结论情景二：阶段性回调</h2>
            <p>若场内多头赢家未进入强力加仓状态，而是以观望持有为主，导致多头加仓力量未过半数（<span class="math-inline">20 &nbsp;&lt;&nbsp; N(L<sup>+</sup>)<sub>total</sub> &nbsp;&lt;&nbsp; 5010</span>），核心顺势买盘退化到弱加仓区间：</p>
            <div class="math-block">
                273 &nbsp;&lt;&nbsp; N(L<sup>*</sup>)<sub>core</sub> &nbsp;&lt;&nbsp; 5263
            </div>
            <p>在此情景下，若场内多头出现一定程度的获利止盈，或者空头加空卖盘短期占据上风，使得边际卖压超过买盘（<span class="math-inline">Q<sub>L</sub> &nbsp;&lt;&nbsp; Q<sub>S</sub></span>），则<strong>价格容易出现阶段性回调或高位震荡</strong>。但这并不代表趋势立即反转，只要不破坏深层结构，回调多表现为趋势的整理中继。</p>
            
            <h2>九、 回调发生后的二次推导</h2>
            <p>当回调发生且没有破坏大级别多头趋势（未跌破关键成本区 and 趋势防守位）时，市场的行为会发生二次演变：</p>
            <p>1. <strong>场外非完全理性资金：</strong> 往往将回调视为低吸上车的良机（即 <span class="math-inline">P(L) ↑</span> 增加）。</p>
            <p>2. <strong>场内非完全理性空头：</strong> 回调强化了侥幸心理，空头选择继续死扛（<span class="math-inline">0 &nbsp;&lt;&nbsp; N(S<sup>-</sup>) &nbsp;&lt;&nbsp; 4990</span>），使得空头的潜在止损买盘被完整保留并延迟至更高的价位。</p>
            <p>3. <strong>场内非完全理性多头：</strong> 多头在回调后认为安全边际提高，行为概率极易从“观望”转化为“逢低加仓”（即 <span class="math-inline">P(L<sup>+</sup>) &nbsp;&gt;&nbsp; P(w<sup>+</sup>)</span>，人数过半数）。</p>
            
            <h2>十、 回调后的综合结果</h2>
            <p>回调重新积蓄了多头力量。场内外逢低加仓与低吸追随，合并为更稳固的保守核心买盘下限：</p>
            <div class="math-block">
                N(L<sup>*</sup>)<sub>core</sub> &nbsp;&gt;&nbsp; 5012
            </div>
            <p>只要这一买盘能转化为边际订单 of 优势，回调后价格重新向上运行并进一步击穿空头止损防守线的概率极高。也就是说：<strong>回调并没有破坏多头结构，反而在行为金融层面为大级别趋势重新提供了燃料。</strong></p>
            
            <h2>十一、 整体结论</h2>
            <p>大级别趋势一旦经过充分博弈确立后，之所以极难在短时间内被逆转，<strong>其根本原因不在于价格本身有物理惯性，而在于趋势确认后，各方交易者的人性反应改变了市场的边际买卖结构：</strong></p>
            <ul>
                <li>赢家倾向于锁仓持有或逢低加仓；</li>
                <li>输家在亏损厌恶下倾向于扛单，被动为上方积累了巨大的潜在止损买盘；</li>
                <li>场外资金受趋势吸引，顺势做多的动力远强于逆势做空。</li>
            </ul>
            <p>简而言之，趋势是仓位结构与人性行为共同制造的结果。只要关键支撑和结构防守不被外生重大冲击击穿，大级别趋势的自我强化与延续就会显著高于立即反转的概率。</p>
        `
    },
    {
        id: 4,
        title: "纸浆交割品低成本锚：LG映射下的SP风干吨人民币成本锚",
        category: "shfe",
        categoryName: "上期所",
        date: "2026-06-07",
        readTime: "8 分钟",
        excerpt: "本文讨论的不是Arauco或CMPC真实厂内成本，而是用中国境内可观测的LG原木盘面，结合漂白得浆率、辐射松基本密度和SP风干吨口径，构造SP可交割BSKP的人民币可观测低成本锚。",
        author: "Zilin",
        avatar: "ZL",
        content: `
            <p><strong>前言：</strong> 本文讨论的不是 Arauco 或 CMPC 真实厂内成本，也不是全球所有浆厂的绝对现金成本，而是用中国境内难以随意伪造的 LG 原木盘面，结合漂白得浆率、辐射松基本密度和 SP 风干吨口径，构造 SP 可交割 BSKP 的人民币可观测低成本锚。</p>
            
            <p>上期所 SP 纸浆期货的交割品不是泛纸浆，也不是所有木浆，而是<strong>漂白硫酸盐针叶木浆</strong>，即 BSKP。其交割逻辑不是单纯按树种交割，而是按<strong>质量标准 + 交易所认可品牌</strong>交割。用于实物交割的漂针浆必须符合交易所质量规定，并且必须是交易所认可生产企业生产的指定品牌。</p>
            
            <p>因此，纸浆期货长期成本底的锚，不应是任意漂针浆报价，而应是同时满足：最低成本 + 可交割 + 可观测 + 可持续供应的 BSKP 产能。</p>
            
            <p>在这一框架下，辐射松制 BSKP 具有特殊意义。一方面，上期所 SP 可交割品牌中包含智利 Arauco 银星、CMPC 太平洋等品牌；另一方面，大商所 LG 原木合约以辐射松作为核心标准品或基准交割树种。</p>
            
            <p>这意味着，辐射松同时连接了两端：</p>
            <blockquote>
                LG 原木盘面 → 辐射松原木人民币价格锚<br>
                SP 可交割品牌 → 辐射松 BSKP 成品浆交割锚
            </blockquote>
            
            <p>但必须明确：辐射松不是因为得浆率和密度绝对最优而成为锚；而是因为它在低木材成本、成熟 BSKP 产能、SP 可交割品牌准入、LG 盘面可观测性上同时成立。</p>
            
            <p>南方松、火炬松、花旗松等针叶木在物理上也可以制备漂白硫酸盐针叶木浆，部分树种甚至可能具有更高密度或更低理论木耗。但它们目前不是上期所 SP 体系中最清晰、最低价、最可观测的可交割锚：南方松现货报价并不低，花旗松缺少对应的 SP 低成本可交割品牌映射。因此，它们可以用于树种敏感性比较，但不适合作为当前 SP 理论低成本锚的主锚。</p>
            
            <h2>一、 SP 风干吨木耗的第一性原理</h2>
            <p>理论低成本锚不能优先采用业界经验值，而应优先采用：<strong>实验室漂白得浆率 + 辐射松基本密度 + SP 风干吨交割口径</strong> 进行推导。</p>
            <p>这里首先必须区分两个概念：</p>
            <ul>
                <li><strong>绝干吨浆：</strong> 完全扣除水分后的浆重量</li>
                <li><strong>风干吨浆：</strong> 商品贸易 and 期货交割中更常用的吨浆口径</li>
            </ul>
            <p>SP 盘面价格对应的是成品漂针浆的商品吨/风干吨口径，而不是实验室意义上的绝干吨口径。因此，如果要将木耗成本与 SP 盘面价格直接比较，不能直接使用 <code>1 ÷ 漂白后得浆率 ÷ 辐射松基本密度</code>（此公式对应的是每 1 吨绝干浆所需原木体积）。</p>
            <p>更严谨的公式应为：</p>
            <blockquote>
                <code>每吨 SP 风干漂针浆所需原木体积 = 0.9 ÷ 漂白后得浆率 ÷ 辐射松基本密度</code>
            </blockquote>
            <p>其中：</p>
            <ul>
                <li>0.9 = 1 吨风干浆约含 0.9 吨绝干浆</li>
                <li>得浆率 = 吨绝干浆 / 吨绝干木</li>
                <li>基本密度 = 吨绝干木 / m³ 原木</li>
            </ul>
            <p>所以：得浆率越高 → 木耗越低；密度越高 → 木耗越低；得浆率越低 → 木耗越高；密度越低 → 木耗越高。</p>
            <p>业界常说“1 吨漂针浆约 5m³ 针叶木”，可以作为商业经验旁证。但必须注意，这个 5m³/吨在不同语境下可能对应不同口径：若按绝干吨浆计算，5m³/吨更接近乐观边界；若按 SP 风干吨浆计算，5m³/吨可以接近学术基准附近。因此，本文后续全部采用 <strong>SP 风干吨口径</strong>，以便与 SP 盘面价格直接比较。</p>
            <p>同时需要说明，该木耗公式本质上是理想木质转化公式。它默认原木体积、基本密度与可制浆绝干木之间可以直接换算，未额外计入剥皮、筛片、腐朽、端头、杂质和检尺差异。因此，它更适合作为理论低估木耗，而不是实际工厂原木采购木耗。</p>

            <h2>二、 辐射松学术木耗参数</h2>
            <p>近年漂白 BSKP 实验室研究显示，漂白后得率通常低于未漂硫酸盐浆。辐射松也不是高密度树种，其基本密度常见区间大致可设为：<code>0.35–0.46 t/m³</code>。</p>
            <p>这里需要特别说明：<strong>0.46 t/m³ 不是辐射松低成本商业轮伐的常态密度，也不是中性假设。</strong>它更接近高密度站地、成熟材、外层材占比较高时可能达到的上沿情形。辐射松若要长期稳定接近 0.46 t/m³，往往需要更长轮伐周期、更成熟材比例或更优站地条件；这与最低木材成本并不原木一致。因此，本文仍保留 0.46 t/m³，但只作为<strong>理论乐观极限密度</strong>，不用作主模型基准。其作用是回答：如果得浆率和木材密度都处在极好状态，LG 映射下的 SP 理论成本锚能够下探到哪里？而不是表示商业辐射松 BSKP 长期都能按 0.46 t/m³ 生产。</p>
            <p>同时还需要强调：<strong>0.46 t/m³ 不能无条件与最低木材价格同时叠加。</strong>因为高密度木材通常可能来自更长轮伐、更成熟材比例或更优站地条件，这些因素可能提高木材价值，不一定对应最低采购成本。因此，若同时使用“低 LG 价格 + 0.46 高密度 + 43.5% 高得浆率”，本质上是在使用双重甚至三重乐观假设。</p>
            <p>模型采用三档参数：</p>
            <ul>
                <li><strong>乐观极限：</strong> 漂白得浆率 43.5%，基本密度 0.46 t/m³，对应木耗为 <code>4.50 m³/吨风干浆</code></li>
                <li><strong>学术基准：</strong> 漂白得浆率 42.0%，基本密度 0.42 t/m³，对应木耗为 <code>5.10 m³/吨风干浆</code></li>
                <li><strong>保守情形：</strong> 漂白得浆率 40.0%，基本密度 0.38 t/m³，对应木耗为 <code>5.92 m³/吨风干浆</code></li>
            </ul>
            <p>因此，严格采用学术实验室得浆率、辐射松基本密度和 SP 风干吨口径推导后，木耗不应写成绝干吨口径下的 5.0 / 5.7 / 6.6 m³/吨浆，而应调整为：理论乐观极限约 4.5m³/吨风干浆，学术基准木耗约 5.1m³/吨风干浆，保守木耗约 5.9m³/吨风干浆（4.5m³/吨 = 极限边界，5.1m³/吨 = 主模型，5.9m³/吨 = 压力测试）。</p>

            <h2>三、 用 LG 盘面倒推木材原料成本</h2>
            <p>大商所 LG 原木合约报价单位为元/立方米，交易单位为 90 立方米/手，标准品为辐射松。因此，LG 盘面可以作为中国境内人民币辐射松原木价格锚。但这里必须严格限定 LG 的含义：<strong>LG 盘面不是智利浆厂真实木材生产成本，而是中国境内可观测的辐射松原木人民币机会成本锚。</strong>也就是说，LG 可以用来回答如果以中国境内可观测辐射松原木价格来映射，SP 可交割 BSKP 的木材成本锚大约在哪里，但不能直接等同于智利 Arauco 或 CMPC 浆厂的真实厂内木材成本。</p>
            <p>对于 Arauco、CMPC 这类一体化林浆企业而言，其真实厂内木材现金成本可能低于中国 LG 原木盘面映射值。但 SP 盘面比较的不是海外浆厂厂内现金成本，而是中国境内可交割仓单价格，需要考虑从海外浆厂到中国交割体系的运输、贸易、资金、仓储、质检、入库和交割摩擦。由于 LG 原木可能包含锯材级机会成本，并不等于低成本浆厂使用的浆材、木片、自有林或锯材剩余物成本，因此 LG 映射值可能高于部分一体化浆厂的真实木材现金成本。本文采用 LG，是为了获得一个可交易、可观测、人民币计价的物理成本锚，故称“LG 映射下的 SP 可交割 BSKP 人民币成本锚”。</p>
            <p>以 LG 近月 6 月收盘价 795.5 元/m³ 计算（<code>木材原料成本 = LG原木盘面价格 × SP风干吨木耗</code>）：</p>
            <ul>
                <li><strong>理论乐观极限：</strong> 795.5 × 4.50 = <code>约 3580 元/吨风干浆</code></li>
                <li><strong>学术基准：</strong> 795.5 × 5.10 = <code>约 4060 元/吨风干浆</code></li>
                <li><strong>保守情形：</strong> 795.5 × 5.92 = <code>约 4710 元/吨风干浆</code></li>
            </ul>
            <p>需要注意，LG × 木耗不是 SP 完整成本，只是 SP 在人民币盘面体系下的木材原料机会成本锚。SP 最终仍是成品浆，必须经过制浆、漂白、包装、仓储、贸易、运输、入库、质检、仓单注册等环节。</p>

            <h2>四、 含税口径校正</h2>
            <p>SP 盘面与 LG 盘面同属于中国境内人民币交割价格体系，因此用 LG 倒推 SP 时，<strong>不需要再乘以 1.13</strong>。更准确地说，LG 盘面价与 SP 盘面价属于同一人民币交割价格体系，盘面对盘面比较时不应额外乘以 1.13。只有使用海外 CIF 美元报价时，才需要使用 <code>CIF美元价 × 汇率 × 1.13</code> 转为含税口径。但使用 LG 盘面时，正确公式是 <code>SP木材原料成本锚 ≈ LG盘面价 × SP风干吨木耗系数</code>，若再额外乘以 1.13，会造成重复含税处理。同时比较的是含增值税交割价格口径下的盘面成本锚，而不是企业净税后利润表成本。</p>

            <h2>五、 极限低估占位摩擦参数</h2>
            <p>从原木价格锚到可交割纸浆仓单价格，中间仍然存在加工、包装、仓储、运输、资金占用、质检、入库、仓单注册等摩擦项。为避免高估低成本锚，本文仅采用<strong>极限低估占位摩擦参数：300–600 元/吨</strong>（该项不是完整生产成本，仅为理论极限模型中对非木材环节的最低占位摩擦）。</p>
            <p>在当前 LG 795.5 元/m³ 测算下：</p>
            <ul>
                <li><strong>理论乐观极限成本锚：</strong> 3580 + (300至600) = <code>约 3900–4200 元/吨</code></li>
                <li><strong>学术基准成本锚：</strong> 4057 + (300至600) = <code>约 4350–4650 元/吨</code></li>
                <li><strong>保守压力成本锚：</strong> 4709 + (300至600) = <code>约 5000–5300 元/吨</code></li>
            </ul>
            <p>这里必须区分：理论乐观极限看乐观情形；更可靠的交易成本锚看学术基准；保守情形用于判断高成本产能压力，而不是全市场绝对底部。</p>

            <h2>六、 为什么辐射松仍然可以作为极限锚</h2>
            <p>引入得浆率、密度和风干吨口径后，辐射松的物理转化优势被削弱，但其成本锚意义没有被推翻。原因在于：辐射松密度和得浆率不一定最高，但其低木材成本、人工林供应、轮伐周期、产业化规模、SP 可交割品牌和 LG 盘面价格锚最完整。判断极限定价锚不能只看木耗最低，而要看可交割产能中的综合木材成本最低。从这个标准看，辐射松仍然是当前最适合作为 SP 理论低成本锚的原料。</p>

            <h2>七、 最终结论与交易含义</h2>
            <p>在当前 LG 795.5 元/m³ 不变的前提下：</p>
            <ul>
                <li><strong>SP 跌至 5000 元/吨附近：</strong> 已经接近保守压力区下沿。</li>
                <li><strong>SP 跌至 4500 元/吨附近：</strong> 接近 LG 映射下的学术基准成本锚。</li>
                <li><strong>SP 跌至 4200 元/吨附近：</strong> 接近理论乐观极限上沿。</li>
                <li><strong>SP 跌至 3900–4000 元/吨附近：</strong> 基本是在交易高得浆率、高密度、低摩擦费用和 LG 锚完全有效同时成立。</li>
                <li><strong>SP 跌至 3900 元/吨以下：</strong> 已低于本文 LG 映射模型的理论乐观极限区间，需要依赖更低海外真实木材成本、更低非木材摩擦或库存失衡等条件解释。</li>
            </ul>
            <p>更严谨的 SP 风干吨模型应采用：<code>SP成本锚 ≈ LG × 0.9 ÷ 漂白得浆率 ÷ 基本密度 + 300–600</code>。在当前 LG 795.5 元/m³ 下，理论乐观极限约 3900–4200 元/吨；学术基准区间约 4350–4650 元/吨；保守压力区间约 5000–5300 元/吨。</p>
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
    
    // Unified exit/cleanup of any fullscreen or simulated fullscreen mode
    if (window.activeChart) {
        try {
            window.activeChart.cleanupFullscreen();
        } catch(e) {
            console.error(e);
        }
    }
    
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
            syncTimeText.innerHTML = '';
        }
        
        // Build the technical UI table and cards
        buildTechnicalUI(data);
        
    } catch (err) {
        console.warn('未检测到真实数据文件，启用高仿真演算模式。', err);
        state.isDataReal = false;
        generateMockData();
        
        statusDot.className = 'status-dot active';
        statusText.textContent = '行情模拟模式';
        syncTimeText.innerHTML = `演示模式 · 数据为模拟数据。`;
        
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
