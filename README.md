# MultiPublish — 多平台内容一键发布

> "一次编写，全平台触达"

**Chrome 浏览器扩展**，将 Markdown 内容自动适配为公众号、知乎、B站、小红书的专属风格，一键真实发布到各平台。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**🎥 Demo 视频**：[待上传]

**作者与协作**：Huyan（[@huyan1349](https://github.com/huyan1349)） × Codex

---

## 一句话说清楚

创作者在 Sidepanel 中写一次 Markdown → 自动生成四个平台的不同风格版本 → 点击发布 → Content Script 将内容真实注入各平台编辑器并自动走完发布流程。

**不模拟、不造假。每一步都是真实的 DOM 操作。**

---

## 核心功能

- **统一编辑器**：Tiptap 所见即所得 + Markdown 快捷输入（`#` 标题、`**` 加粗、`-` 列表、`>` 引用）
- **四平台智能适配**：相同内容自动转换四种风格
- **实时预览 + 编辑**：Tab 切换查看各平台效果，支持人工微调
- **真实一键发布**：Content Script 直接操作平台编辑器 DOM，自动填入并点击发布
- **批量发布**：一键将内容同时发布到所有选定平台
- **发布记录**：追踪每次发布状态和时间
- **导出发布包**：下载 zip 含各平台 HTML + JSON
- **暗色主题**：深色编辑室风格 UI

---

## 四平台适配策略

| 平台 | 风格特点 | 注入方式 | 自动发布 |
|------|---------|---------|---------|
| **公众号** | 正式长文，行内样式 HTML，层次分明 | `all_frames` 穿透 UEditor iframe | ✅ |
| **知乎** | 问题式标题，结论先行，Markdown 格式 | ClipboardEvent 突破 Draft.js | ✅ 多步确认流程 |
| **B站** | 视频化风格，标签驱动，含时间轴 | Quill.js 编辑器 DOM 注入 | ✅ |
| **小红书** | 短标题（≤20字），种草文案，emoji + 话题标签 | textarea native value setter | ✅ |

---

## 技术栈

| 层 | 技术 |
|---|---|
| 扩展框架 | [Plasmo](https://docs.plasmo.com/) — Manifest V3 |
| UI | React 18 + TypeScript |
| 编辑器 | [Tiptap](https://tiptap.dev/)（ProseMirror） |
| 状态管理 | [Zustand](https://zustand-demo.pmnd.rs/) |
| 存储 | `chrome.storage.local`（@plasmohq/storage） |
| 图标 | [Lucide React](https://lucide.dev/) |
| 包管理 | pnpm |

---

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装与运行

```bash
git clone https://github.com/huyan1349/MultiPublish.git
cd MultiPublish/extension
pnpm install
pnpm build        # 生产构建 → build/chrome-mv3-prod/
```

### 加载扩展

1. Chrome 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension/build/chrome-mv3-prod/` 目录
5. 点击工具栏扩展图标 → 打开侧边栏即可使用

### 使用前准备

需在浏览器中登录各目标平台：

- 微信公众号：`https://mp.weixin.qq.com/`
- 知乎：`https://www.zhihu.com/`
- B站：`https://www.bilibili.com/`
- 小红书：`https://creator.xiaohongshu.com/`

扩展自动复用浏览器登录态，无需额外配置。

---

## Demo 演示流程

1. 打开 Sidepanel → 看到 Dashboard 仪表盘
2. 点击「开始创作」→ 进入编辑器
3. 点击「Demo」自动填入示例内容
4. 勾选目标平台（公众号/知乎/B站/小红书）
5. 点击「生成」→ 切换到预览页
6. Tab 切换查看四个平台的不同适配效果
7. 点击「发布到xxx」单独发布，或「一键发布全部平台」
8. 观察目标平台页面：内容已被自动填入，发布按钮被自动点击
9. 查看「发布记录」确认发布结果

---

## 架构

```
┌─ Sidepanel (React) ───────────────────┐
│  Dashboard → Editor → Preview → Records │
└──────────┬────────────────────────────┘
           │ chrome.runtime.sendMessage
           ▼
┌─ Background Service Worker ───────────┐
│  编排发布：写 storage → 开 tab → 等待结果 │
└──────────┬────────────────────────────┘
           │ chrome.storage.local
           ▼
┌─ Content Scripts (注入平台页面) ───────┐
│  读 storage → 填编辑器 → 点击发布 → 回报 │
└───────────────────────────────────────┘
```

### 适配器接口

```typescript
interface PlatformAdapter {
  platform: PlatformType;
  displayName: string;
  validate(content: StandardContent): ValidationResult;
  transform(content: StandardContent): PlatformOutputDraft;
  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta;
}
```

### 新增平台只需 3 步

1. 新建 Adapter 文件，实现 `PlatformAdapter` 接口
2. 在 `AdapterFactory` 注册
3. 添加 Content Script + Background URL

---

## 项目结构

```
├── extension/               # Chrome 扩展（主项目）
│   └── src/
│       ├── background.ts     # Service Worker
│       ├── sidepanel.tsx     # Sidepanel UI（4 页面）
│       ├── contents/         # Content Scripts
│       │   ├── wechat.ts     # 公众号 — UEditor iframe 穿透
│       │   ├── zhihu.ts      # 知乎 — ClipboardEvent + 弹窗自动处理
│       │   ├── bilibili.ts   # B站 — Quill.js 注入
│       │   └── xiaohongshu.ts # 小红书 — textarea 注入
│       ├── shared/           # 共享类型 + Toast 组件
│       └── sidepanel/
│           ├── adapters/     # 平台适配器（4 个平台）
│           ├── stores/       # Zustand store
│           ├── components/   # TiptapEditor
│           ├── utils/        # exportZip
│           └── styles/       # 全局 CSS
└── web/                     # Web 端（早期前端 + 后端，仅供参考）
    ├── frontend/
    └── backend/
```

---

## 依赖清单

| 依赖 | 版本 | 用途 | 许可证 |
|------|------|------|--------|
| plasmo | ^0.89 | 扩展开发框架 | MIT |
| react | ^18.3 | UI 框架 | MIT |
| react-dom | ^18.3 | React DOM | MIT |
| @plasmohq/storage | ^1.9 | chrome.storage 封装 | MIT |
| @tiptap/react | ^3.23 | 富文本编辑器 | MIT |
| @tiptap/starter-kit | ^3.23 | 编辑器扩展 | MIT |
| @tiptap/extension-placeholder | ^3.23 | 编辑器占位 | MIT |
| @tiptap/extension-link | ^3.23 | 编辑器链接 | MIT |
| zustand | ^5.0 | 状态管理 | MIT |
| lucide-react | ^0.547 | 图标库 | ISC |
| typescript | ^5.6 | 类型系统 | Apache-2.0 |

---

## 原创性声明

本项目核心模块为原创设计：

- **四平台适配器 + 变换规则**：公众号行内样式 HTML、知乎 Markdown 保留、B站视频时间轴、小红书种草风格
- **Content Script DOM 注入策略**：知乎 ClipboardEvent 绕过 Draft.js、微信 `all_frames` iframe 穿透、B站 Quill.js DOM 注入、小红书 React value setter
- **知乎多弹窗自动处理**：3 种格式确认弹窗的自动识别与关闭
- **Sidepanel UI**：Dashboard/Editor/Preview/Records 完整工作流
- **适配器架构**：`PlatformAdapter` 接口 + `AdapterFactory` 注册中心

本项目受 [MultiPost-Extension](https://github.com/leaperone/MultiPost-Extension) 浏览器扩展架构启发（Plasmo + Content Script + Adapter 模式），但各平台注入策略、弹窗处理、格式转换规则、UI 均为独立实现。

---

## 已知限制

- **依赖平台 DOM 结构**：平台改版可能导致 Content Script 选择器失效，需持续维护
- **需提前登录**：发布前需在浏览器中已登录目标平台
- **小红书图片**：仅填充文字内容，图片需手动上传
- **公众号 iframe**：部分账号 UEditor 配置可能不同，注入成功率非 100%

---

## License

MIT © 2026 MultiPublish
