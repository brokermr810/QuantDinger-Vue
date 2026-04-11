<div align="center">
  <img src="https://raw.githubusercontent.com/brokermr810/QuantDinger/main/docs/screenshots/logo.png" alt="QuantDinger" width="120" />
</div>

<h1 align="center">QuantDinger Frontend</h1>

<p align="center">
  <strong>QuantDinger v3.0.1 的 Vue.js 前端源码</strong><br/>
  <strong>AI 原生量化研究、策略、交易与运营工作台的 Web 界面层</strong>
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> ·
  <a href="./README_CN.md"><strong>简体中文</strong></a>
</p>

<p align="center">
  <a href="https://github.com/brokermr810/QuantDinger"><img src="https://img.shields.io/badge/Main_Repo-QuantDinger-blue?logo=github" alt="Main Repo" /></a>
  <img src="https://img.shields.io/badge/Vue-2.x-4FC08D?logo=vue.js" alt="Vue 2" />
  <img src="https://img.shields.io/badge/UI-Ant_Design_Vue-1890ff?logo=ant-design" alt="Ant Design Vue" />
  <img src="https://img.shields.io/badge/Charts-KLineCharts%20%2B%20ECharts-ff6600" alt="Charts" />
  <img src="https://img.shields.io/badge/i18n-10_Languages-green" alt="i18n" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Source_Available-orange" alt="License" /></a>
</p>

<p align="center">
  <a href="https://ai.quantdinger.com">在线演示</a> ·
  <a href="https://github.com/brokermr810/QuantDinger">主仓库</a> ·
  <a href="https://t.me/worldinbroker">Telegram</a> ·
  <a href="#license">许可证</a>
</p>

---

## 概览

本仓库是 QuantDinger 的 Vue.js 前端源码仓库，承载产品的 Web 界面层，负责连接后端能力与用户交互，包括 AI 分析、图表研究、策略开发、回测、交易执行、计费和用户管理等前端工作流。

如果你要查找 Docker Compose 一键部署、后端 API、完整产品说明或正式部署文档，请优先查看主仓库：

- [QuantDinger 主仓库](https://github.com/brokermr810/QuantDinger)

## 这个前端仓库提供什么

### 1. 研究与分析工作台

- AI 分析页面，用于结构化市场研究与交易判断支持
- 面向加密货币、股票、外汇等场景的多视图研究界面
- 与后端 Fast Analysis、历史分析、资产研究能力联动
- Polymarket 预测市场分析相关前端界面

### 2. 指标与策略编写体验

- 浏览器内完成 Python 指标与策略编辑
- 自然语言辅助生成代码的产品流程
- 集成专业 K 线图，方便信号检查与策略验证
- 支持趋势线、覆盖物等图表交互工具

### 3. 回测与复盘界面

- 回测中心界面，用于发起、查看和复盘回测结果
- 收益曲线、交易记录、结果摘要和配置回顾
- 与后端策略持久化模型对齐的策略级回测工作流
- 支持研究迭代与策略改进的前端交互链路

### 4. 交易与组合运营

- 交易助手页面，覆盖策略生命周期管理
- 快速交易面板，支持从信号场景直接进入下单流程
- 组合监控页面和虚拟持仓管理
- 交易所账户绑定与执行相关组件

### 5. 平台与商业化界面

- 会员、积分、计费、支付相关页面
- 用户资料、系统设置、管理员视图与 OAuth 流程
- 指标社区与市场化相关页面
- 响应式布局、主题切换与多语言支持

## v3.0.1 文档定位

这份中文版 README 作为英文主 README 的补充版本，保持以下原则：

- 以英文 README 作为前端仓库的主说明文档
- 中文版用于帮助中文开发者快速理解仓库职责和开发方式
- 文档口径与主仓库 `v3.0.1` 版本说明保持一致

## 开发环境启动

### 前置要求

| 要求 | 版本 |
|------|------|
| Node.js | 建议 16+ |
| npm | 8+ |
| Backend | 可访问的 QuantDinger 后端，默认 `http://localhost:5000` |

### 安装与启动

```bash
git clone https://github.com/brokermr810/QuantDinger-Vue.git
cd QuantDinger-Vue
npm install
npm run serve
```

开发服务器默认地址：

- `http://localhost:8000`

默认登录信息取决于后端配置。在默认 Docker 体验中，常见为：

```text
quantdinger / 123456
```

### API 代理

本地开发时，`/api/*` 请求会通过 `vue.config.js` 代理到后端。

- 代理配置文件：`vue.config.js`
- 默认目标地址：`http://localhost:5000`

如果后端运行在其他地址或端口，请相应调整代理配置。

## 推荐集成方式

### 方式 A：使用主仓库

对于大多数用户，推荐直接使用 QuantDinger 主仓库。主仓库已经提供：

- Docker Compose 一键部署
- 后端服务与数据库
- Nginx 前端托管与 API 反向代理
- 更完整的产品文档与部署文档

入口：

- [QuantDinger 主仓库](https://github.com/brokermr810/QuantDinger)

### 方式 B：前端源码开发

当你需要以下能力时，适合直接使用本仓库：

- 自定义 Web UI
- 开发新的页面或组件
- 调整图表、国际化或后台管理流程
- 构建自己的前端产物并连接兼容后端

## 生产构建

```bash
npm run build
```

构建产物输出到 `dist/`，可由 Nginx 或其他静态文件服务托管。

如果你需要完整的生产部署方案，仍建议优先使用主仓库中的交付方式。

## 功能模块分布

### 分析与研究页面

- `src/views/ai-analysis/`
- `src/views/ai-asset-analysis/`
- `src/views/dashboard/`
- `src/views/indicator-analysis/`

### 策略、IDE 与回测

- `src/views/indicator-ide/`
- `src/views/backtest-center/`
- `src/views/trading-assistant/`
- `src/views/trading-bot/`

### 执行与组合

- `src/components/QuickTradePanel/`
- `src/views/portfolio/`
- `src/components/ExchangeAccountModal/`

### 计费、社区与用户系统

- `src/views/billing/`
- `src/views/indicator-community/`
- `src/views/settings/`
- `src/views/profile/`
- `src/views/user/`

## 项目结构

```text
QuantDinger-Vue/
├── public/                    # 静态资源与 HTML 壳
├── src/
│   ├── api/                   # API 请求模块
│   ├── assets/                # 图片、图标、样式
│   ├── components/            # 通用组件
│   ├── config/                # 应用与路由配置
│   ├── core/                  # 启动、认证、全局初始化
│   ├── layouts/               # 页面布局
│   ├── locales/               # 国际化资源
│   ├── router/                # Vue Router 配置
│   ├── store/                 # Vuex 状态管理
│   ├── utils/                 # 工具、请求拦截器、加密辅助
│   └── views/                 # 页面级模块
├── vue.config.js              # Vue CLI / webpack 与代理配置
├── babel.config.js
├── package.json
├── Dockerfile
└── LICENSE
```

## 技术栈

| 层级 | 技术 |
|------|------|
| Framework | Vue 2.x、Vue Router、Vuex |
| UI | Ant Design Vue |
| Charts | KLineCharts、ECharts |
| Editor | CodeMirror 5 |
| Networking | Axios + interceptors |
| i18n | vue-i18n |
| Build | Vue CLI、Webpack 4 |
| Styling | Less + scoped CSS |

## 国际化

当前前端通过 `src/locales/lang/` 支持 10 种语言：

| 语言 | 文件 | 语言 | 文件 |
|------|------|------|------|
| English | `en-US.js` | 简体中文 | `zh-CN.js` |
| 繁體中文 | `zh-TW.js` | 日本語 | `ja-JP.js` |
| 한국어 | `ko-KR.js` | Deutsch | `de-DE.js` |
| Français | `fr-FR.js` | ไทย | `th-TH.js` |
| Tiếng Việt | `vi-VN.js` | العربية | `ar-SA.js` |

如需新增语言，可参考现有格式新增文件，并在 `src/locales/index.js` 中注册。

## 截图与产品文档

本仓库聚焦前端源码开发。若需查看完整产品截图、视觉导览和正式文档，请参考：

- [主仓库 README](https://github.com/brokermr810/QuantDinger)
- [主仓库 docs](https://github.com/brokermr810/QuantDinger/tree/main/docs)

## 贡献

欢迎贡献。

推荐流程：

1. Fork 本仓库。
2. 创建功能分支，例如 `feature/my-change`。
3. 使用清晰的提交信息完成开发。
4. 推送分支。
5. 发起 Pull Request。

也建议同时参考主仓库的贡献说明：

- [Contributing Guide](https://github.com/brokermr810/QuantDinger/blob/main/CONTRIBUTING.md)

## 社区与支持

| 渠道 | 链接 |
|------|------|
| Telegram | [t.me/worldinbroker](https://t.me/worldinbroker) |
| GitHub Issues | [问题反馈 / 功能建议](https://github.com/brokermr810/QuantDinger/issues) |
| Email | [brokermr810@gmail.com](mailto:brokermr810@gmail.com) |

## License

本仓库采用 **QuantDinger Frontend Source-Available License v1.0**。完整条款见 [`LICENSE`](./LICENSE)。

| 用户类型 | 成本 | 权限范围 |
|----------|------|----------|
| 个人用户 | 免费 | 在许可范围内用于学习、研究、非商业使用、修改与分发 |
| 学校 / 大学 / 非营利组织 / 公共研究机构 | 免费 | 在其使命相关范围内使用 |
| 商业实体 | 需要授权 | 请联系 QuantDinger 获取商业授权 |

未经书面许可，不得移除或修改品牌标识、水印和相关识别内容。

商业授权联系：

- [quantdinger.com](https://quantdinger.com)
- [brokermr810@gmail.com](mailto:brokermr810@gmail.com)

## 致谢

本前端构建于成熟的开源生态之上：

- [Vue.js](https://vuejs.org/)
- [Ant Design Vue](https://antdv.com/)
- [KLineCharts](https://github.com/klinecharts/KLineChart)
- [ECharts](https://echarts.apache.org/)
- [CodeMirror](https://codemirror.net/)
- [Axios](https://axios-http.com/)
- [vue-i18n](https://kazupon.github.io/vue-i18n/)
- [ant-design-vue-pro](https://github.com/vueComponent/ant-design-vue-pro)

<p align="center">
  如果 QuantDinger 对你有帮助，欢迎给项目点一个 Star。
</p>
