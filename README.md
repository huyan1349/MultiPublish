# ContentBridge — 多平台内容发布工具

> 一次创作，多端适配。自动将内容转换为公众号、知乎、B站、小红书的专属风格，一键模拟发布。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**🎥 Demo 视频**：[待上传至 B站/云盘后替换此链接]

---

## 项目背景

内容创作者面临一个核心痛点：在不同平台（公众号、知乎、B站、小红书等）发布内容时，每个平台对格式、排版、字数、标签、封面尺寸等要求各不相同。创作者需要花费大量时间手动调整，**单篇多平台完整发布耗时 40-85 分钟**。

ContentBridge 解决的就是这个问题——用户在统一编辑器中输入一次内容，系统自动适配各平台格式与风格，支持预览、编辑和模拟一键发布。

## 核心功能

- **统一内容编辑**：在统一界面输入标题、正文（Markdown）、标签、封面图
- **智能格式适配**：自动将内容转换为公众号（正式长文）、知乎（逻辑分析）、B站（视频风格）、小红书（种草短文案）四种风格
- **分平台预览**：Tab 切换查看各平台适配效果，支持人工微调
- **模拟一键发布**：无需真实平台账号，模拟完整发布流程并生成发布记录
- **发布记录追踪**：查看所有历史发布记录，含平台、状态、时间
- **可扩展适配器架构**：新增平台只需实现 `PlatformAdapter` 接口并注册

## 支持平台

| 平台 | 适配风格 | 输出特点 |
|------|----------|----------|
| 🟢 公众号 | 正式长文 | 结构化正文、80-120字摘要、稳重标题 |
| 🔵 知乎 | 逻辑分析 | 问题式标题、结论先行、知识标签 |
| 🩷 B站 | 视频化表达 | 视频标题、简介、时间轴、分区标签 |
| 🔴 小红书 | 种草短文案 | 短标题（≤20字）、口语化、emoji + 话题标签 |

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | React 18 + TypeScript + Vite | UI 框架与构建 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 路由 | React Router DOM v6 | 前端路由 |
| 状态 | Zustand | 轻量状态管理 |
| 图标 | Lucide React | 图标库 |
| 后端 | Express + TypeScript | API 服务 |
| 数据库 | SQLite + Prisma ORM | 数据持久化 |
| 验证 | Zod | 请求参数校验 |

## 项目结构

```
├── frontend/                # React 前端
│   └── src/
│       ├── components/      # 组件（layout/ui）
│       ├── pages/           # 页面（Dashboard/Editor/Preview/PublishRecords）
│       ├── api/             # API 请求层
│       ├── types/           # TypeScript 类型定义
│       ├── stores/          # Zustand 状态管理
│       ├── utils/           # 工具函数
│       └── styles/          # 全局样式
├── backend/                 # Express 后端
│   └── src/
│       ├── routes/          # API 路由
│       ├── controllers/     # 请求处理
│       ├── services/        # 业务逻辑
│       ├── adapters/        # 平台适配器（wechat/zhihu/bilibili/xiaohongshu）
│       ├── publishers/      # 发布策略
│       ├── models/          # 数据模型
│       └── middleware/      # 中间件
├── docs/                    # 项目文档
└── demo-assets/             # Demo 截图与素材
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/huyan1349/MultiPublish.git
cd MultiPublish

# 2. 启动后端（端口 3001）
cd backend
npm install
npx prisma db push    # 初始化 SQLite 数据库
npm run dev

# 3. 新开终端，启动前端（端口 5173）
cd frontend
npm install
npm run dev
```

打开浏览器访问 `http://localhost:5173`

### Demo 演示流程

1. 打开首页 Dashboard，点击「开始创作」
2. 在编辑器输入标题、正文（支持 Markdown）、标签
3. 勾选目标平台（公众号/知乎/B站/小红书）
4. 点击「生成适配」查看各平台预览
5. 切换 Tab 对比不同平台的风格差异
6. 点击「一键模拟发布」
7. 查看发布记录页面，确认 4 条发布成功记录

## 核心架构

```
用户输入 StandardContent
    → ParserService（Markdown → ContentBlock[]）
    → AdapterService（调用各平台 Adapter）
    → PlatformAdapter（validate + transform → PlatformOutput）
    → PublishService（MockPublisher → PublishRecord）
    → 前端预览 / 发布记录展示
```

### 平台适配器接口

```typescript
interface PlatformAdapter {
  platform: PlatformType;
  displayName: string;
  validate(content: StandardContent): ValidationResult;
  transform(content: StandardContent): PlatformOutputDraft;
  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta;
}
```

### 扩展新平台

只需 4 步，核心框架零改动：

1. 在 `backend/src/adapters/` 新建适配器文件，实现 `PlatformAdapter` 接口
2. 在 `AdapterFactory` 中注册
3. 在前端类型中新增平台元数据
4. 在预览页面添加新 Tab

## 依赖清单

### 前端

| 依赖 | 版本 | 用途 | 许可证 |
|------|------|------|--------|
| react | ^18.3.1 | UI 框架 | MIT |
| react-dom | ^18.3.1 | React DOM | MIT |
| react-router-dom | ^6.26.2 | 前端路由 | MIT |
| zustand | ^5.0.1 | 状态管理 | MIT |
| lucide-react | ^0.547.0 | 图标 | ISC |
| tailwindcss | ^3.4.16 | 样式框架 | MIT |
| vite | ^6.0.3 | 构建工具 | MIT |
| typescript | ^5.6.3 | 类型系统 | Apache-2.0 |

### 后端

| 依赖 | 版本 | 用途 | 许可证 |
|------|------|------|--------|
| express | ^4.21.1 | HTTP 框架 | MIT |
| @prisma/client | ^6.1.0 | ORM | Apache-2.0 |
| prisma | ^6.1.0 | 数据库迁移 | Apache-2.0 |
| zod | ^3.24.1 | 请求验证 | MIT |
| cors | ^2.8.5 | 跨域 | MIT |
| helmet | ^8.0.0 | 安全头 | MIT |
| tsx | ^4.19.2 | TS 运行 | MIT |

## 原创功能说明

以下模块为完全原创设计和实现：

- **平台适配器架构**：`PlatformAdapter` 接口 + `AdapterFactory` 注册中心，新增平台只需实现接口
- **格式转换引擎**：Markdown → ContentBlock[] → 平台特定输出的转换管道
- **平台风格规则**：四个平台（公众号/知乎/B站/小红书）的差异化适配规则
- **模拟发布系统**：无需真实平台账号的完整发布流程模拟
- **前端 UI 设计**：从零设计的编辑-预览-发布工作流

本项目的适配器架构设计受到 MultiPost 浏览器扩展架构的启发，但全部代码为独立实现，未复用任何第三方项目代码。

## 已知限制

- 当前版本采用**模拟发布**，不接入真实平台 API。原因是各平台 API 权限审核门槛高（公众号需认证服务号、小红书不开放发布 API 等）
- 架构已预留 `Publisher` 接口，后续可替换为真实 API 集成或浏览器自动化方案
- Markdown 渲染暂不支持复杂 LaTeX 公式和 Mermaid 图表

## 后续规划

- [ ] AI 辅助标题改写与摘要生成
- [ ] 图片上传与跨平台尺寸自动适配
- [ ] 更多平台支持（头条号、百家号、CSDN、掘金等）
- [ ] 定时发布与发布日历
- [ ] 多账号管理
- [ ] 发布后数据回收（阅读量、点赞等）

## 开发记录

本项目为七牛云 72 小时暑期实训营参赛作品。开发过程遵循持续交付原则，所有功能通过独立 PR 提交：

| PR# | 分支 | 内容 |
|-----|------|------|
| #1 | feature/init-docs | 项目规划文档 + CLAUDE.md |
| #2 | feature/init-frontend | 前端脚手架 |
| #3 | feature/init-backend | 后端脚手架 |

所有 commit 时间戳在比赛时间窗口内，main 分支始终可运行。

## License

MIT © 2026 ContentBridge
