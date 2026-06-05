# 山风蛊小站 | Summit Wind Investment Portal

> 🌐 **在线演示地址 (GitHub Pages)**: [https://kannzz3.github.io/personal-investment-site/](https://kannzz3.github.io/personal-investment-site/)

一个专为个人投资者、大宗商品及量化交易爱好者设计的个人投资思考与期货数据分析网站。本站具有视觉精美、简约优美的深色（终端）风格，并提供了对中国商品期货市场的全套行情可视化及资金管理工具。

## 🌟 核心功能

1. **期货行情与分析看板 (Market Dashboard)**:
   - 内置国内主力期货合约：沪金 (AU)、沪铜 (CU)、螺纹钢 (RB)、原油 (SC)、白糖 (SR)、PTA (TA)。
   - **智能主力合约追踪**: 内置持仓量 (OI) 分析引擎，自动识别并锁定当前市场最具流动性的主力合约进行行情实时追踪。
   - **自研高性能 Canvas K线与分时图**: 提供完整的 K线、成交量副图、均线系统（MA5/10/20）、以及鼠标十字光标移动追踪和 Tooltip 悬浮提示。
   - 期限结构（升贴水）柱状图展示，以及基于均线的量化策略信号倾向提示。
2. **投资思考文章板块 (Investment Thoughts)**:
   - 瀑布流卡片展示，支持按“宏观研究”、“商品交易”、“资产配置”等类别进行动态过滤。
   - **无缝内联阅读器**: 点击文章卡片直接原地毛玻璃展开，带有顶部阅读进度条，优化的排版设计。
3. **期货仓位与风险管理计算器 (Risk Calculator)**:
   - 支持一键导入看板当前选择合约的价格、乘数及保证金比例。
   - 输入账户总资金、单笔承受风险比例(%)及硬止损点数，即时计算出**建议交易手数、占用保证金、仓位杠杆、最大亏损金额和止损价格**。
   - 内置安全风险进度条，智能评估仓位危险系数，防范爆仓。
4. **数据双轨驱动系统 (Dual-Data Engine)**:
   - **行情演算器模式 (默认)**: 本地无真实数据时，内置高仿真数据引擎和实时 Tick 波动时钟，打开即用。
   - **真实数据同步模式**: 使用配套 Python 脚本，一键拉取国内商品期货最新主力真实行情并与前端同步。

---

## 🚀 快速开始

### 方法 1：直接双击运行（行情演算模式）
本站采用零构建的原生前端技术（HTML5, Vanilla CSS3, ES6 Modules）。
1. 双击 `index.html` 即可在任意浏览器中打开。
2. 此时，数据指示灯将显示为 `行情模拟模式`。本站将启动内置的行情跳动模拟时钟，您依然可以顺畅使用 K线交互、栏目切换和风险计算器。

### 方法 2：使用本地服务运行（推荐，支持数据同步）
由于现代浏览器对本地文件的 `Fetch` 请求有跨域限制（CORS），若想查看真实同步的期货行情，建议在本地启动一个简易静态服务：

1. **通过 Python 启动静态服务**:
   在项目根目录下打开命令行，运行：
   ```bash
   python -m http.server 8000
   ```
2. **在浏览器中访问**:
   打开浏览器，访问 [http://localhost:8000](http://localhost:8000)。

---

## 🔄 数据同步接入 (同步真实国内期货数据)

本小站提供了一个无缝接入中国商品期货（新浪财经数据源）的历史与分钟行情同步管道：

1. **安装 Python 依赖库**:
   确保您电脑中安装了 Python 3.x，然后在命令行中执行：
   ```bash
   pip install akshare pandas
   ```
2. **运行同步脚本**:
   在项目根目录下运行数据抓取脚本：
   ```bash
   python sync_data.py
   ```
3. **完成同步**:
   脚本运行成功后，会在本地生成 `data/futures_data.json` 文件。此时启动本地静态服务（方法 2）刷新网页，顶部的指示灯将点亮为蓝色：`真实数据同步`。K线图和看板将完美渲染真实的国内商品期货行情！

---

## 🌐 部署到 GitHub Pages (发布到线上)

您可以将本小站免费且快速地部署到 GitHub 上，生成属于您自己的在线个人投资网站：

1. **新建 GitHub 仓库**:
   在您的 GitHub 账号下创建一个新的 Repository（例如 `my-investment-site`）。
2. **提交并推送代码**:
   在项目根目录下初始化 Git 并提交推送：
   ```bash
   git init
   git add .
   git commit -m "Initialize investment portal"
   git remote add origin https://github.com/您的用户名/您的仓库名.git
   git branch -M main
   git push -u origin main
   ```
3. **启用 GitHub Pages**:
   - 进入 GitHub 仓库页面，点击右上角的 **Settings**。
   - 在左侧侧边栏中选择 **Pages**。
   - 在 **Build and deployment** 下的 Source 处选择 **Deploy from a branch**。
   - Branch 选择 `main` 分支和 `/ (root)` 路径，点击 **Save**。
4. **访问您的站点**:
   稍等 1-2 分钟，GitHub 部署成功后，您即可直接访问：[https://kannzz3.github.io/personal-investment-site/](https://kannzz3.github.io/personal-investment-site/)。

---

## 🛠 技术框架与设计细节

- **排版与样式**: 使用 Vanilla CSS 和全局 CSS 变量搭建了一整套精致、高对比度的深浅主题系统。
- **微动画与模糊**: 大量应用 `backdrop-filter: blur(...)` 毛玻璃质感、卡片上浮悬停阴影、平滑路由切换。
- **自研 Canvas 图表**: `chart.js` 没有引入大型复杂的图表库（如 ECharts），而是直接在 HTML5 Canvas 上绘制蜡烛线、价格坐标和均线，这使得行情图表加载速度极快、内存占用低，且具备完全的可定制性。
- **向量图标**: 引入了现代极简的 Lucide 矢量图标库，提升视觉高级感。
