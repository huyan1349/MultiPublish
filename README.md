# MultiPublish — 多平台内容发布工具

> "一次编写，全平台触达" — Markdown 编写一次，自动适配公众号、知乎、B站、小红书四平台格式，真实注入目标编辑器并触发发布流程。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**🎥 Demo 视频**：[待上传至 B站/云盘后替换此链接]

---

## 项目背景

内容创作者面临一个核心痛点：在不同平台（公众号、知乎、B站、小红书等）发布内容时，每个平台对格式、排版、字数、标签、封面尺寸等要求各不相同。创作者需要花费大量时间手动调整，**单篇多平台完整发布耗时 40-85 分钟**。

MultiPublish 解决的就是这个问题——用户在所见即所得编辑器中输入一次内容，系统自动适配各平台格式与风格，支持预览、编辑和一键发布。

## 核心功能

- **所见即所得编辑器（Tiptap）**：工具栏支持加粗、斜体、标题、列表、引用、图片、撤销/重做，Markdown 快捷输入，**图片可拖拽缩放**
- **AI 写作助手**：集成 DeepSeek API，一键 AI 生成/改写内容，支持脉冲高亮 + 流式逐块渐现动画
- **图片上传（四平台）**：支持图片插入编辑器，自动转换为各平台格式 — 公众号素材上传、B站/小红书多策略 DOM 注入、知乎剪贴板粘贴
- **智能格式适配**：自动将内容转换为公众号（行内样式 HTML）、知乎（Markdown）、B站（视频描述+时间轴）、小红书（emoji+话题标签）四种风格
- **分平台预览**：Tab 切换查看各平台适配效果，支持人工编辑微调
- **真发布（Chrome 扩展）**：Content Script 自动注入内容到平台编辑器，无需 API
- **单平台 / 一键全发**：每个平台独立发布，或一次性批量发布全部
- **发布记录追踪**：展示所有发布记录，含平台、状态、时间
- **Dashboard 仪表盘**：内容总数、发布统计 + 最近内容快速入口
- **暗夜编辑室主题**：深色系 UI，暖金强调色，磨砂玻璃卡片
- **一键 Demo 填充**：自动填入示例，快速体验完整流程
- **可扩展适配器架构**：新增平台只需实现 `PlatformAdapter` 接口并注册

## 支持平台

| 平台 | 适配风格 | 输出特点 |
|------|----------|----------|
| 公众号 | 正式长文 | 内联样式 HTML、80-120字摘要、稳重标题 |
| 知乎 | 逻辑分析 | 问题式标题、结论先行、知识标签 |
| B站 | 视频化表达 | 视频标题、简介、时间轴、分区标签 |
| 小红书 | 种草短文案 | 短标题（≤20字）、口语化、emoji + 话题标签 |

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | React 18 + TypeScript + Vite | UI 框架与构建 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 路由 | React Router DOM v6 | 前端路由 |
| 状态 | Zustand | 编辑器草稿状态 |
| 编辑器 | Tiptap (ProseMirror) | 所见即所得富文本编辑 |
| 图标 | Lucide React | 图标库 |
| 后端 | Express + TypeScript | API 服务 |
| 数据库 | SQLite + Prisma ORM | 数据持久化 |
| 验证 | Zod | 请求参数校验 |

## 项目结构

```
├── web/
│   ├── frontend/            # React 前端
│   │   └── src/
│   │       ├── components/  # 组件（editor/layout/publish/ui）
│   │       ├── pages/       # 页面（Dashboard/Editor/Preview/QuickStart）
│   │       ├── adapters/    # 平台适配器（wechat/zhihu/bilibili/xiaohongshu）
│   │       ├── services/    # API 请求 + DeepSeek AI 服务
│   │       ├── stores/      # Zustand 状态管理
│   │       ├── utils/       # 工具函数（图片、扩展桥接）
│   │       └── styles/      # 全局样式（CSS 品牌色变量）
│   └── backend/             # Express 后端
│       └── src/
│           ├── routes/      # API 路由
│           ├── controllers/ # 请求处理
│           ├── services/    # 业务逻辑（parser/adapter/publish）
│           ├── adapters/    # 平台适配器（wechat/zhihu/bilibili/xiaohongshu）
│           ├── publishers/  # 发布策略
│           └── middleware/  # 中间件（CSP/错误处理）
├── extension/               # Chrome 扩展（真发布）
│   └── src/
│       ├── sidepanel.tsx     # 侧边栏 UI（Editor/Preview/Records）
│       ├── background.ts     # Service Worker（消息路由+标签页管理+图片数据清理）
│       ├── shared/           # 共享类型 + Toast 工具
│       ├── contents/         # Content Scripts（DOM 注入）
│       │   ├── wechat.ts     # 微信公众号 — UEditor iframe 穿透
│       │   ├── zhihu.ts      # 知乎 — ClipboardEvent 模拟
│       │   ├── bilibili.ts   # B站 — 多策略图片上传 + DOM 注入
│       │   └── xiaohongshu.ts # 小红书 — 多策略图片上传 + DOM 注入
│       └── sidepanel/adapters/ # 平台适配器（与 Web 版共享逻辑）
├── start.bat                # Windows 一键启动脚本
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 方式一：一键启动

| 系统 | 脚本 |
|------|------|
| Windows | 双击 `start.bat` |
| macOS | 双击 `start.command` 或终端运行 `./start.command` |

自动安装依赖 → 初始化数据库 → 启动后端 + 前端 → 打开浏览器。

### 方式二：手动启动

```bash
# 1. 克隆仓库
git clone https://github.com/huyan1349/MultiPublish.git
cd MultiPublish

# 2. 启动后端（端口 4395）
cd web/backend
pnpm install
npx prisma db push
pnpm dev

# 3. 新开终端，启动前端（端口 5173）
cd web/frontend
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173`

### Demo 演示流程

1. 打开 Dashboard → 点击「开始创作」
2. 点击「Demo 内容」自动填充示例
3. 勾选目标平台 → 点击「生成适配」
4. 切换到预览页，Tab 切换查看四个平台的不同风格
5. 点「发布到此平台」独立发布，或「一键全发」批量发布
6. 查看发布记录页面，确认发布结果

### Chrome 扩展（真发布）

Chrome 扩展通过 Content Script 直接将适配内容注入到平台编辑器，实现**真实发布**。

```bash
cd extension
pnpm install
pnpm build        # 产出 build/chrome-mv3-prod/
```

**加载**：Chrome → `chrome://extensions/` → 开发者模式 → 加载已解压 → 选 `extension/build/chrome-mv3-prod/`

**发布原理**：Storage 信号机制 — Background 写待发布数据到 `chrome.storage.local` → Content Script 加载后自主读取 → `MutationObserver` 轮询编辑器 DOM → 注入内容 → 写结果回 Storage → Background 回报用户。所有操作均为真实 DOM 注入，不依赖平台 API。

| 平台 | 注入策略 |
|------|----------|
| 公众号 | `all_frames: true` 穿透双层 UEditor iframe，`MutationObserver` 轮询 `[contenteditable]`，图片通过剪贴板粘贴 |
| 知乎 | `ClipboardEvent` 模拟粘贴 + `DataTransfer`，突破 Draft.js 不可变状态 |
| B站 | 多策略：file input 搜索（主文档 + shadow DOM）→ 工具栏按钮点击 → ClipboardEvent 粘贴 |
| 小红书 | 多策略：编辑器内 file input → 全局 image accept input → ClipboardEvent 粘贴 → 工具栏按钮捕获 |

**使用前**：需先在浏览器中登录各平台（`mp.weixin.qq.com` / `zhuanlan.zhihu.com` / `member.bilibili.com` / `creator.xiaohongshu.com`），扩展自动复用登录态。

## 核心架构

```
用户输入 → Tiptap 编辑器（HTML）
    → ParserService（HTML/Markdown → ContentBlock[]）
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

### 扩展新平台（4 步）

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
| @tiptap/react | latest | 富文本编辑器 | MIT |
| @tiptap/starter-kit | latest | 编辑器基础扩展 | MIT |
| @tiptap/extension-placeholder | latest | 编辑器占位文字 | MIT |
| @tiptap/extension-link | latest | 编辑器链接支持 | MIT |
| @tiptap/extension-image | latest | 编辑器图片支持（可拖拽缩放） | MIT |
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

- **平台适配器架构**：`PlatformAdapter` 接口 + `AdapterFactory` 注册中心，新增平台只需实现接口并注册
- **格式转换引擎**：HTML/Markdown 双格式 → ContentBlock[] → 平台特定输出
- **平台风格规则**：四个平台差异化适配（公众号行内样式 / 知乎 MD / B站时间轴 / 小红书种草风格）
- **Tiptap 编辑器集成**：工具栏 + Markdown 快捷输入的创作体验
- **模拟发布系统**：无需真实平台账号的完整发布流程
- **前端 UI**：从零设计的编辑-预览-发布工作流

## 已知限制

- **Web 应用**：采用模拟发布。各平台 API 权限审核门槛高（公众号需认证服务号、小红书不开放发布 API 等）
- **Chrome 扩展**：DOM 注入依赖平台页面结构，平台改版可能导致注入失败，需持续维护 CSS 选择器
- 小红书发布依赖登录态和页面结构，平台改版可能导致注入失败
- **AI 功能**：依赖 DeepSeek API Key（需在 `web/backend/.env` 中配置 `DEEPSEEK_API_KEY`）
- **图片上传**：公众号图片需通过微信素材库上传，当前为外链模式；跨平台尺寸自动适配仍在开发中

## 后续规划

- [x] AI 辅助标题改写与摘要生成（DeepSeek API 集成）
- [x] 图片上传（四平台）与编辑器内拖拽缩放
- [x] Chrome 扩展真发布（四平台 Content Script DOM 注入）
- [x] 知乎完整自动发布链路（填充 + 发布按钮点击）
- [ ] 公众号自动发布（填充后自动点击发布按钮）
- [ ] B站自动发布（填充后自动点击发布按钮）
- [ ] 小红书自动发布（填充后自动点击发布按钮）
- [ ] 公众号图片素材库上传（外链 → 微信素材库 → 替换 src）
- [ ] 图片跨平台尺寸自动适配（封面、正文图片尺寸裁剪）
- [ ] AST 格式转换管道（unified/remark 替代当前简单解析）
- [ ] 登录态检测（发布前检测是否已登录，未登录提示）
- [ ] 更多平台支持（头条号、百家号、CSDN、掘金等）
- [ ] 定时发布与发布日历
- [ ] 草稿自动保存（编辑内容自动持久化，关闭重开不丢失）

## 开发记录

七牛云 72 小时暑期实训营参赛作品，持续交付：

| PR# | 内容 |
|-----|------|
| #1 | 项目规划文档 + CLAUDE.md |
| #2 | 前端脚手架（Vite + React + Tailwind + 路由） |
| #3 | 后端脚手架（Express + Prisma + SQLite + CRUD） |
| #4 | README 更新 |
| #5 | ParserService + 4 平台 Adapter + 适配 API |
| #6 | MockPublisher + publish API + 发布记录 API |
| #7 | Editor + Preview + PublishRecords 完整前端 |
| #8 | 单平台独立发布 + 已发布标记 |
| #9 | 端口统一 4395 + 一键启动脚本 |
| #10 | Tiptap 所见即所得编辑器 + Dashboard 统计面板 |
| #11 | Chrome 扩展真发布 — Plasmo + Content Script DOM 注入 |
| #12 | 扩展暗夜编辑室 UI + storage 信号发布机制 + MutationObserver 轮询 |
| #13 | 公众号完整发布链路 — 剪贴板方案 + 扩展桥接 + 自动发布 |
| #14 | AI写作助手+平台预览重构+大纲展开+公众号全自动发布 |
| #15 | 编辑台三步流程 + AI内容生成 + multipush writer |
| #16 | 一键优化全部平台按钮 + 美化按钮可见性修复 |
| #17 | 四平台图片上传 + web 前端对接图片功能 |
| #18 | AI生成按钮脉冲高亮 + 流式逐块模糊渐现动画 |
| #19 | 修复缺失的 @tiptap/extension-image 依赖 |
| #20 | CSS变量拼接bug修复 + 生成按钮可见性修复 |
| #21 | 可拖拽缩放图片编辑器 + B站/小红书多策略图片上传 + CSP安全头 |

### Chrome 扩展

| 依赖 | 版本 | 用途 | 许可证 |
|------|------|------|--------|
| plasmo | ^0.89 | 扩展开发框架 | MIT |
| @plasmohq/storage | ^1.9 | chrome.storage 封装 | MIT |
| @tiptap/react | ^3.23 | 富文本编辑器 | MIT |
| @tiptap/starter-kit | ^3.23 | 编辑器基础扩展 | MIT |
| @tiptap/extension-image | ^3.23 | 图片拖拽缩放扩展 | MIT |
| @tiptap/extension-link | ^3.23 | 链接支持 | MIT |
| @tiptap/extension-placeholder | ^3.23 | 占位文字 | MIT |
| react | ^18.3 | UI | MIT |
| zustand | ^5.0 | 状态管理 | MIT |
| lucide-react | ^0.547 | 图标 | ISC |

## License

MIT © 2026 MultiPublish
