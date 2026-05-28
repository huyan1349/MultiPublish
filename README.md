# MultiPublish

> 多平台内容发布工具 —— 一次编写，智能适配，一键发布

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 项目简介

MultiPublish 是一款 Chrome 浏览器扩展，帮助创作者在公众号、知乎、B站、小红书等平台同步发布内容。核心能力：

- **Markdown 编辑器**：内置编辑器，所见即所得
- **智能格式适配**：同一篇内容自动转换为各平台最佳排版
- **一键发布 / 模拟发布**：真实发布到平台，或模拟预览效果
- **适配器架构**：新增平台只需实现一个 Adapter 接口

## 技术栈

| 技术 | 用途 |
|------|------|
| Plasmo | Chrome Extension MV3 开发框架 |
| React 18 + TypeScript | UI 层 |
| Milkdown / CodeMirror 6 | Markdown 编辑器 |
| highlight.js | 代码高亮 |
| Tailwind CSS | 样式 |
| chrome.storage.local + IndexedDB | 本地存储 |
| Vite | 构建工具 |

## 项目结构

```
src/
├── background/          # Service Worker
├── content/             # Content Scripts（平台注入）
├── sidepanel/           # 侧边栏 UI
├── platforms/           # 平台适配器
│   ├── wechat/          # 微信公众号
│   ├── zhihu/           # 知乎
│   ├── bilibili/        # B站
│   └── xiaohongshu/     # 小红书
└── shared/              # 共享模块
    ├── types/           # 类型定义
    ├── theme/           # 排版主题
    └── utils/           # 工具函数
assets/                  # 静态资源
docs/                    # 文档
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 依赖声明

| 依赖 | 版本 | 用途 | 原创功能说明 |
|------|------|------|-------------|
| plasmo | ^0.89 | Extension 开发框架 | 框架层，非原创 |
| react | ^18.3 | UI 渲染 | 框架层，非原创 |
| @milkdown/core | ^7.2 | Markdown 编辑器 | 编辑器集成逻辑为原创 |
| highlight.js | ^11.9 | 代码高亮 | 主题适配逻辑为原创 |
| tailwindcss | ^3.4 | 样式系统 | 框架层，非原创 |

**原创功能**：Platform Adapter 接口设计、AST Transformer 管道、Theme 渲染引擎、Content Script DOM 注入策略、模拟发布模块

## Demo 视频

> [待上传] 上传至 B站/云盘后在此放置链接

## 团队

| 成员 | GitHub | 分工 |
|------|--------|------|
| 刘峥岩 | @huyan1349 | 架构设计、Transformer 引擎、适配器开发 |
| 队友 | @xyh202131 | UI 开发、Content Script、测试 |

## License

MIT
