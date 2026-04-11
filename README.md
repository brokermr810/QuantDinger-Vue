<div align="center">
  <img src="https://raw.githubusercontent.com/brokermr810/QuantDinger/main/docs/screenshots/logo.png" alt="QuantDinger" width="120" />
</div>

<h1 align="center">QuantDinger Frontend</h1>

<p align="center">
  <strong>Vue.js frontend source for QuantDinger v3.0.1</strong><br/>
  <strong>AI-native quant research, strategy, trading, and operations workspace</strong>
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
  <a href="https://ai.quantdinger.com">Live Demo</a> ·
  <a href="https://github.com/brokermr810/QuantDinger">Main Repository</a> ·
  <a href="https://t.me/worldinbroker">Telegram</a> ·
  <a href="#license">License</a>
</p>

---

## Overview

This repository contains the Vue.js frontend source code for QuantDinger. It is the web application layer that connects traders, researchers, and operators to the QuantDinger backend for AI analysis, charting, strategy development, backtesting, execution, billing, and user management.

If you are looking for one-click deployment, Docker Compose, backend APIs, or the full product documentation, start with the main repository:

- [QuantDinger main repository](https://github.com/brokermr810/QuantDinger)

## What This Frontend Delivers

### 1. Research and Analysis Workspace

- AI analysis pages for structured market research and decision support
- Multi-view market interfaces for crypto, stocks, forex, and related research flows
- Fast analysis, history review, and asset-research experiences connected to backend services
- Polymarket analysis UI for prediction-market research workflows

### 2. Strategy and Indicator Authoring

- Browser-based Python indicator and strategy editing workflows
- Natural-language assisted code generation experiences
- Professional K-line chart integration for signal inspection and strategy validation
- Drawing tools and chart overlays for discretionary and systematic workflows

### 3. Backtesting and Review

- Backtest Center interfaces for running and reviewing backtests
- Equity curves, trade records, result summaries, and configuration review
- Strategy-linked backtesting flows aligned with the backend persistence model
- UI support for iterative research and strategy refinement

### 4. Trading and Portfolio Operations

- Trading assistant pages for the strategy lifecycle
- Quick trade panel for direct execution from signal contexts
- Portfolio monitoring views and virtual position management
- Exchange account binding and execution-related UI components

### 5. Platform and Commercial Features

- Membership, credits, billing, and payment-related pages
- User profile, settings, role-aware admin views, and OAuth-related flows
- Indicator community and marketplace-oriented interfaces
- Responsive layout, theme switching, and multilingual support

## v3.0.1 Positioning

For `v3.0.1`, this frontend README is aligned with the current product scope and the main repository documentation:

- product messaging is now consistent with the actual QuantDinger deployment model
- frontend capabilities are described as part of a full-stack trading product, not an isolated demo UI
- documentation now matches the recent strategy backtesting productization and the latest public version label

## Development Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 16+ recommended |
| npm | 8+ |
| Backend | QuantDinger backend available at `http://localhost:5000` |

### Install and Run

```bash
git clone https://github.com/brokermr810/QuantDinger-Vue.git
cd QuantDinger-Vue
npm install
npm run serve
```

The development server runs at:

- `http://localhost:8000`

Default login is determined by the backend configuration. In the default Docker experience it is commonly:

```text
quantdinger / 123456
```

### API Proxy

In local development, `/api/*` requests are proxied to the backend through `vue.config.js`.

- Proxy config file: `vue.config.js`
- Default backend target: `http://localhost:5000`

If your backend runs elsewhere, update the proxy target accordingly.

## Recommended Integration Modes

### Option A: Use the Main Repository

For most users, the recommended path is to use the main QuantDinger repository, which includes Docker Compose, backend services, Nginx delivery, and deployment documentation:

- [QuantDinger main repository](https://github.com/brokermr810/QuantDinger)

### Option B: Frontend Source Development

Use this repository directly when you want to:

- customize the web UI
- develop new pages or components
- adjust charting, internationalization, or admin workflows
- build and publish your own frontend artifact against a compatible backend

## Production Build

```bash
npm run build
```

Build output is generated in `dist/`. You can serve it with Nginx or another static file server.

For a production-ready integrated deployment, prefer the delivery model from the main repository, which already provides frontend serving and API proxying.

## Functional Areas

### Analysis and Research Pages

- `src/views/ai-analysis/`
- `src/views/ai-asset-analysis/`
- `src/views/dashboard/`
- `src/views/indicator-analysis/`

### Strategy, IDE, and Backtesting

- `src/views/indicator-ide/`
- `src/views/backtest-center/`
- `src/views/trading-assistant/`
- `src/views/trading-bot/`

### Execution and Portfolio

- `src/components/QuickTradePanel/`
- `src/views/portfolio/`
- `src/components/ExchangeAccountModal/`

### Billing, Community, and User System

- `src/views/billing/`
- `src/views/indicator-community/`
- `src/views/settings/`
- `src/views/profile/`
- `src/views/user/`

## Project Structure

```text
QuantDinger-Vue/
├── public/                    # Static assets and HTML shell
├── src/
│   ├── api/                   # API request modules
│   ├── assets/                # Images, icons, styles
│   ├── components/            # Shared UI components
│   ├── config/                # App and router config
│   ├── core/                  # Bootstrapping, auth, app setup
│   ├── layouts/               # Page layouts
│   ├── locales/               # i18n resources
│   ├── router/                # Vue Router configuration
│   ├── store/                 # Vuex state management
│   ├── utils/                 # Helpers, request interceptors, crypto utils
│   └── views/                 # Page-level modules
├── vue.config.js              # Vue CLI / webpack config and proxy
├── babel.config.js
├── package.json
├── Dockerfile
└── LICENSE
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 2.x, Vue Router, Vuex |
| UI | Ant Design Vue |
| Charts | KLineCharts, ECharts |
| Editor | CodeMirror 5 |
| Networking | Axios with interceptors |
| i18n | vue-i18n |
| Build | Vue CLI, Webpack 4 |
| Styling | Less and scoped CSS |

## Internationalization

QuantDinger frontend currently supports 10 languages through `src/locales/lang/`:

| Language | File | Language | File |
|----------|------|----------|------|
| English | `en-US.js` | 简体中文 | `zh-CN.js` |
| 繁體中文 | `zh-TW.js` | 日本語 | `ja-JP.js` |
| 한국어 | `ko-KR.js` | Deutsch | `de-DE.js` |
| Français | `fr-FR.js` | ไทย | `th-TH.js` |
| Tiếng Việt | `vi-VN.js` | العربية | `ar-SA.js` |

To add another language, create a matching file and register it in `src/locales/index.js`.

## Screenshots and Product Docs

This repository focuses on frontend source development. For visual product tours and full product-level documentation, see:

- [Main README](https://github.com/brokermr810/QuantDinger)
- [Main repo docs](https://github.com/brokermr810/QuantDinger/tree/main/docs)

## Contributing

Contributions are welcome.

Recommended workflow:

1. Fork this repository.
2. Create a feature branch such as `feature/my-change`.
3. Commit with clear messages.
4. Push your branch.
5. Open a pull request.

Please also review the main repository contribution guidance:

- [Contributing Guide](https://github.com/brokermr810/QuantDinger/blob/main/CONTRIBUTING.md)

## Community and Support

| Channel | Link |
|---------|------|
| Telegram | [t.me/worldinbroker](https://t.me/worldinbroker) |
| GitHub Issues | [Report bugs / Request features](https://github.com/brokermr810/QuantDinger/issues) |
| Email | [brokermr810@gmail.com](mailto:brokermr810@gmail.com) |

## License

This repository is released under the **QuantDinger Frontend Source-Available License v1.0**. See [`LICENSE`](./LICENSE) for the full license text.

| User Type | Cost | Permission Scope |
|-----------|------|------------------|
| Individuals | Free | Learning, research, non-commercial use, modification, and redistribution within license terms |
| Schools / universities / non-profits / public research institutions | Free | Mission-aligned use under the license terms |
| Commercial entities | License required | Contact QuantDinger for commercial authorization |

Branding, trademarks, and watermark removal are not permitted without written approval.

For commercial licensing:

- [quantdinger.com](https://quantdinger.com)
- [brokermr810@gmail.com](mailto:brokermr810@gmail.com)

## Acknowledgements

This frontend builds on a strong open-source ecosystem:

- [Vue.js](https://vuejs.org/)
- [Ant Design Vue](https://antdv.com/)
- [KLineCharts](https://github.com/klinecharts/KLineChart)
- [ECharts](https://echarts.apache.org/)
- [CodeMirror](https://codemirror.net/)
- [Axios](https://axios-http.com/)
- [vue-i18n](https://kazupon.github.io/vue-i18n/)
- [ant-design-vue-pro](https://github.com/vueComponent/ant-design-vue-pro)

<p align="center">
  If QuantDinger helps you, consider giving it a star.
</p>
