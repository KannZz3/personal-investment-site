# 山风蛊 | Summit Wind Portal

在线页面：[https://kannzz3.github.io/personal-investment-site/](https://kannzz3.github.io/personal-investment-site/)

山风蛊是一个个人投资研究与中国商品期货数据可视化小站。当前版本以真实代码和当前 UI 为准：前端是无构建步骤的静态页面，读取仓库内的 `data/futures_data.json`，不在浏览器中直连交易所、天勤或实时行情接口。

当前主线是：

```text
TqSdk 全市场持仓量扫描
  -> 筛选 OI 创新高 / 近历史高品种
  -> 只为异动品种写入详细 K 线
  -> GitHub Pages 静态前端读取 JSON 并渲染图表、Profile、异动表和研究文章
```

## 当前页面

### 市场看板

市场看板只展示当前 `metadata.anomalies` 中的异动合约，而不是全品种行情列表。

- 顶部横向卡片展示当前异动合约，并联动主图。
- 主图支持 `K线` 与 `分时` 两种模式。
- K 线周期支持 `5M`、`15M`、`30M`、`1H`、`4H`、`日K`、`周K`、`月K`。
- `4H` 由 `min60` 在前端聚合；`周K`、`月K` 由当前具体合约日线在前端聚合。
- 指标支持 `MA5`、`MA10`、`MA20`、`MA40` 和 `VOL`。
- 分时模式会基于分钟数据计算并展示 VWAP 与 `TDOI-WAP`，`TDOI-WAP` 支持调整半衰期交易天数。
- Canvas 图表支持十字光标、缩放、拖拽、滚动条、全屏、水平线、趋势线、折线和本地画线保存。
- TPO/VP 可叠加到图表上，用于观察价格分布、POC、VAH、VAL 和 Profile 数据质量。

### 合约异动

合约异动页面展示全市场 OI 扫描结果和当前异动合约。

- 扫描范围来自 `sync_data.py` 中的 `ALL_CFG`，当前覆盖 69 个商品期货品种。
- 表格展示品种、交易所、当前持仓、估算沉淀保证金、历史峰值、峰值日期、OI 比率和状态。
- `OI创新高`：当前持仓量达到或超过历史峰值。
- `OI近历史高`：当前持仓量达到历史峰值的 90% 以上。
- 页面还包含基于成本锚文章映射的保证金/价格偏离表，用于把研究内容和当前市场状态连接起来。
- 异动卡片提供一键跳转回市场看板的入口。

### 投资思考

投资思考是站内硬编码文章库，当前文章直接维护在 `app.js` 的 `articles` 数组中。

- 支持按 `上期所`、`上期能源`、`大商所`、`郑商所`、`广期所`、`投资随笔` 过滤。
- 点击文章后进入页面内阅读器，包含作者、日期、阅读时间和阅读进度。
- 当前内容重点是商品交割品成本锚、产业链极限成本、价格条件概率和组合思考。

当前文章包括：

- 支撑位的贝叶斯：价格条件如何改变上行概率
- 趋势的博弈：大级别趋势确立后的行为金融推导
- 投资组合
- 纸浆交割品低成本锚：LG映射下的SP风干吨人民币成本锚
- 天然橡胶交割品理论下限：以国产 SCR WF 与泰国 RSS3 双锚推导
- 棕榈油 P 合约成本锚：从 FFB 到仓单
- 聚丙烯交割品极限成本锚：从油制、PDH 到煤制
- 工业硅交割标的极限生成成本锚
- 焦煤交割品极限成本锚
- 碳酸锂交割品成本锚：锂辉石和锂云母路线
- 白糖交割品成本锚：国产甘蔗与巴西原糖加工
- 金银成本锚与货币化
- 螺纹钢与热卷成本锚：长流程下沿与电炉边际

### 关于本站

关于本站页面保留项目定位、作者联系入口和 GitHub 链接。当前 UI 的设计和信息架构是最新版本，应以页面本身为准。

## 数据文件

前端读取：

```text
data/futures_data.json
```

当前 JSON 结构：

```text
{
  "metadata": {
    "sync_time": "...",
    "version": "6.1",
    "description": "Full market TqSdk OI screen | K-line data (TqSdk Only Optimized)",
    "historyYears": 35,
    "nearHighThresh": 0.9,
    "anomalies": [...],
    "failed_scans": [...],
    "screening": { ... },
    "contracts": { ... }
  },
  "SP": {
    "daily": [...],
    "min1": [...],
    "min5": [...],
    "min15": [...],
    "min30": [...],
    "min60": [...]
  }
}
```

关键点：

- `metadata.screening` 保存全部已扫描品种的 OI 结果。
- `metadata.contracts` 保存全部品种的合约元数据、保证金、乘数、最新价、持仓分析等。
- `metadata.anomalies` 保存当前满足异动条件的品种代码。
- 顶层详细 K 线只写入异动品种，非异动品种不写入详细 `daily/min1/min5/min15/min30/min60`。
- 当前页面加载后会把市场看板合约列表收敛到 `metadata.anomalies`，因此 UI 与数据体积都围绕“异动优先”设计。

## 数据同步

核心脚本：[sync_data.py](./sync_data.py)

当前同步脚本是 `TqSdk Only Optimized`，真实依赖为：

```bash
pip install pandas tqsdk
```

运行同步前需要提供天勤账号：

```bash
export TQ_USERNAME=your_username
export TQ_PASSWORD=your_password
python sync_data.py
```

Windows PowerShell 示例：

```powershell
$env:TQ_USERNAME="your_username"
$env:TQ_PASSWORD="your_password"
python sync_data.py
```

同步流程：

1. 读取 `ALL_CFG` 中全部品种配置。
2. 使用 TqSdk 预注册并下载全部品种主连日线。
3. 对每个品种计算当前 OI、历史峰值、峰值日期、OI Ratio 和异动状态。
4. 将 `near_high` 与 `new_high` 品种加入 `metadata.anomalies`。
5. 对异动品种解析当前具体主力合约，例如 `SP2609`、`EB2608`。
6. 只为异动品种下载具体合约的 `daily`、`min1`、`min5`、`min15`、`min30`、`min60`。
7. 过滤异常值和过旧的复用合约月份数据。
8. 使用 `json.dump(..., allow_nan=False)` 写入 `data/futures_data.json`。

如果没有 `TQ_USERNAME` 或 `TQ_PASSWORD`，当前脚本会失败退出；代码中没有自动降级到 Sina/AkShare 的生产路径。

## 图表与 Profile 规则

### K 线

- 分钟数据来自具体主力合约，单频率最多约 1500 根。
- 日线同样使用当前具体主力合约。
- `4H` 在前端由 `min60` 聚合。
- `周K`、`月K` 在前端由日线聚合。
- 分时图优先使用 `min1`，结合日线前收盘和分钟成交计算 VWAP/TDOI-WAP。

### TPO

- 支持 `30m TPO`、`日 TPO`、`周 TPO`。
- TPO 严格基于 `min30`，不使用其他频率降级。
- 日复合 TPO 默认回看 20 个交易日。
- 周复合 TPO 默认回看 8 周，按 40 个交易日近似。

### Volume Profile

- 支持 `30m VP`、`日 VP`、`周 VP`。
- VP 优先使用 `min1`，可降级到 `min5`。
- 当前实现不使用 `min15`、`min30`、`min60` 或日线作为 VP 构建源。
- 日/周复合 VP 会在可用数据不足完整窗口时继续构建，并在图表 tooltip/边界提示中标记 `partial` 或 fallback 状态。

## GitHub Actions

### 数据同步

工作流：[.github/workflows/sync_data.yml](./.github/workflows/sync_data.yml)

- 工作日北京时间日盘收盘后和夜盘收盘后多次定时触发，用多个 schedule 做兜底。
- 支持手动触发。
- 需要仓库 Secrets：`TQ_USERNAME`、`TQ_PASSWORD`。
- 若 `data/futures_data.json` 有变化，会自动提交：

```text
data: auto-sync main contracts by OI ... UTC [skip ci]
```

### 静态资源版本号

工作流：[.github/workflows/auto_version.yml](./.github/workflows/auto_version.yml)

当 `app.js`、`style.css`、`chart.js`、`profile.js` 变动时，自动把 `index.html` 中的资源版本参数更新为当前 commit short hash，避免 GitHub Pages 和浏览器缓存旧资源。

## 本地运行

只查看前端：

```bash
python server.py
```

或在 Windows 上运行：

```bat
start_local.bat
```

推荐通过本地 HTTP 服务访问页面。直接双击 `index.html` 时，浏览器可能因为本地文件跨域限制无法读取 `data/futures_data.json`。

## 文件结构

```text
index.html                 页面结构、导航、四个主页面区域、阅读器和页脚
style.css                  主题、布局、响应式、卡片、表格、阅读器、图表周边样式
app.js                     SPA 状态、数据加载、文章库、UI 渲染、周期聚合、分时计算
chart.js                   Canvas 图表、交互、画线、本地保存、TPO/VP 叠加渲染
profile.js                 TPO 与 Volume Profile 计算、数据可用性和边界判断
sync_data.py               TqSdk 全市场 OI 扫描、异动筛选、详细 K 线同步、JSON 导出
server.py                  本地静态 HTTP 服务，自动寻找可用端口
start_local.bat            Windows 本地启动脚本
data/futures_data.json     GitHub Pages 前端读取的行情与扫描结果
.github/workflows/         自动数据同步与静态资源版本号更新
scratch/                   数据覆盖验证、搜索和调试脚本，不属于页面运行主路径
```

## 注意事项

- 本站是静态研究页面，不提供交易、下单或实时行情服务。
- 页面展示的数据取决于最近一次 GitHub Actions 或本地 `sync_data.py` 同步结果。
- 市场看板只展示当前异动合约；没有异动时会显示空状态。
- 文章和成本锚内容是个人研究记录，不构成投资建议。
- 期货和衍生品交易具有高杠杆和高风险，任何结论都应结合自身风险承受能力独立判断。
