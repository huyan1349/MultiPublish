# CLAUDE.md

> MultiPublish — "一次编写，全平台触达"
> Chrome 浏览器扩展，多平台内容真实发布工具
> 
> — Huyan & Codex

---

## 0. 项目定位

MultiPublish 是 Chrome Manifest V3 浏览器扩展。创作者在 Sidepanel 中一次编写 Markdown，系统自动适配为公众号、知乎、B站、小红书的格式，通过 Content Script 将内容**真实注入目标平台编辑器并触发发布流程**。

**核心理念**：不模拟、不造假。每一步都是真实的平台操作——评委打开目标平台页面就能看到内容已被填入、排版正确。

**三大差异化**：
- Markdown 优先 + 平台风格自动适配（不是简单复制粘贴）
- **真实发布**：Content Script 直接操作各平台编辑器 DOM，走真实发布流程
- 策略模式可扩展架构（新增平台 = 一个 Adapter + 一个 Content Script）

---

## 1. 技术栈

| 层 | 选型 |
|---|---|
| 扩展框架 | Plasmo |
| UI | React 18 + TypeScript |
| 编辑器 | Tiptap（富文本） |
| 状态管理 | Zustand |
| 存储 | @plasmohq/storage（chrome.storage） |
| 图标 | lucide-react |
| 包管理 | pnpm |

---

## 2. 架构：真实发布三层模型

```
┌─ Sidepanel ────────────────────────────────────────────────┐
│  Dashboard → Editor → Preview → Records                    │
│  编辑 Markdown → 平台适配器生成 → 预览/编辑 → 一键发布        │
└──────────┬─────────────────────────────────────────────────┘
           │ chrome.runtime.sendMessage({ type: 'PUBLISH_TO_PLATFORM' })
           ▼
┌─ Background Service Worker ────────────────────────────────┐
│  1. 将填充数据写入 chrome.storage.local                      │
│  2. chrome.tabs.create 打开目标平台编辑器页面                │
│  3. 通过 storage.onChanged 等待 Content Script 填充/发布结果 │
│  4. 返回真实发布结果给 Sidepanel                             │
└──────────┬─────────────────────────────────────────────────┘
           │ chrome.storage.local (contentbridge_fill)
           ▼
┌─ Content Script（注入到平台页面，真实操作 DOM）──────────────┐
│  1. 读取 storage 中的填充数据                                │
│  2. MutationObserver 轮询找到编辑器元素                      │
│  3. 填入标题、正文、标签（各平台策略不同）                     │
│  4. 自动点击发布按钮，走完平台真实发布流程                    │
│  5. 结果写回 storage (contentbridge_result)                 │
│  6. 页面内 Toast 提示用户发布状态                             │
└────────────────────────────────────────────────────────────┘
```

**关键原则**：每一步都真实发生。用户/评委可以在目标平台页面亲眼看到内容被填入、发布按钮被点击。

---

## 3. 目录结构

```
extension/
├── src/
│   ├── background.ts             # Service Worker — 编排真实发布流程
│   ├── sidepanel.tsx             # Sidepanel 入口（Dashboard/Editor/Preview/Records）
│   ├── shared/
│   │   ├── types.ts              # 核心类型
│   │   └── contentToast.ts       # Content Script 页面内浮动提示
│   ├── contents/                 # Content Scripts — 真实操作平台 DOM
│   │   ├── zhihu.ts              # 知乎：填充 + Markdown弹窗关闭 + 自动点击发布
│   │   ├── wechat.ts             # 公众号：iframe 穿透 + 填充标题/编辑器
│   │   ├── bilibili.ts           # B站：填充标题/编辑器/标签
│   │   └── xiaohongshu.ts        # 小红书：填充标题/正文/话题标签
│   └── sidepanel/
│       ├── stores/contentStore.ts    # Zustand + Demo 内容
│       ├── adapters/
│       │   ├── PlatformAdapter.ts    # 适配器类型 + 接口
│       │   ├── AdapterFactory.ts     # 注册/获取适配器
│       │   ├── parserService.ts      # HTML/Markdown → ContentBlock[]
│       │   ├── wechat/WechatAdapter.ts
│       │   ├── zhihu/ZhihuAdapter.ts
│       │   ├── bilibili/BilibiliAdapter.ts
│       │   └── xiaohongshu/XiaohongshuAdapter.ts
│       ├── components/TiptapEditor.tsx
│       ├── utils/exportZip.ts
│       └── styles/index.css
└── test/
```

---

## 4. 四平台发布策略

| 平台 | 编辑器底层 | 注入策略 | 自动发布 | 当前状态 |
|------|-----------|---------|---------|---------|
| 知乎 | Draft.js | ClipboardEvent 模拟粘贴 | ✅ 自动点击发布按钮 | **完成** |
| 公众号 | UEditor (iframe) | all_frames 穿透 + innerHTML | ⚠️ 填充后需手动确认 | 填充可用 |
| B站 | Quill.js | innerHTML + input 事件 | ⚠️ 填充后需手动确认 | 填充可用 |
| 小红书 | textarea + file input | setNativeValue | ⚠️ 填充后需手动确认 | 填充可用 |

**目标**：四个平台全部达到知乎级别——自动填充 + 自动走完发布流程。

---

## 5. 平台发布 URL

| 平台 | 编辑器 URL |
|------|-----------|
| 公众号 | `mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77` |
| 知乎 | `zhuanlan.zhihu.com/write` |
| B站 | `member.bilibili.com/platform/upload/video/frame` |
| 小红书 | `creator.xiaohongshu.com/publish/publish` |

---

## 6. 当前状态与优先级

### 已完成
- [x] Plasmo 脚手架 + React 18 + TS
- [x] 四平台适配器（transform + validate + getPreviewMeta）
- [x] 四平台 Content Script（DOM 注入）
- [x] 知乎完整发布链路（填充 + Markdown弹窗 + 自动发布）
- [x] 微信 iframe 穿透（all_frames）
- [x] Sidepanel 四页面（Dashboard/Editor/Preview/Records）
- [x] Background SW 发布编排
- [x] Tiptap 富文本编辑器
- [x] 暗色主题

### 待完成（按优先级）

| P | 任务 | 说明 |
|----|------|------|
| **P0** | 统一类型定义 | `shared/types.ts` 与 `adapters/PlatformAdapter.ts` 类型重复，合并 |
| **P0** | 公众号自动发布 | 参照知乎，在微信 Content Script 中自动点击发布按钮 |
| **P0** | B站自动发布 | 参照知乎，自动点击 B 站发布流程 |
| **P0** | 小红书自动发布 | 参照知乎，自动点击小红书发布流程 |
| **P1** | SW 保活策略 | chrome.alarms 防止 MV3 30s 休眠中断发布 |
| **P1** | 登录态检测 | 发布前检测是否已登录，未登录时提示 |
| **P1** | 微信图片上传 | 外链图片 → 微信素材库 → 替换 src |
| **P2** | AST 格式转换 | unified/remark 管道替代当前简单解析 |
| **P2** | Theme 配置系统 | 嵌套选择器支持，从 Adapter 提取样式配置 |
| **P2** | TransformTrace | 追踪转换差异，展示给用户各平台做了什么改动 |
| **P2** | Sidepanel 拆分 | 当前 ~730 行单文件，拆为独立页面组件 |
| **P2** | 草稿自动保存 | 编辑内容自动持久化，关闭重开不丢失 |

---

## 7. 开发命令

```bash
cd extension
pnpm install
pnpm dev         # 开发模式（热更新）
pnpm build       # 生产构建 → build/chrome-mv3-prod/
```

加载扩展：Chrome → `chrome://extensions` → 开发者模式 → 加载已解压 → 选 `build/chrome-mv3-prod/`

---

## 8. Git 工作流规范

### 核心铁律

- **永远不 push main**，所有代码走 feature 分支 + PR
- **一个 PR 只做一件事**，粒度尽可能细；大功能拆成多个独立 PR
- **每天至少推一次**，证明持续交付，攒到最后一天一次性提交 = 直接判无效
- **main 分支随时可运行**，评委任意时间拉下来能跑
- commit 描述用**中文**

### 标准流程

```bash
# 1. 拉最新
git checkout main && git pull origin main

# 2. 开分支（命名：feature/xxx、fix/xxx、refactor/xxx、docs/xxx、chore/xxx）
git checkout -b feature/简短描述

# 3. 写代码，小步 commit
git add <具体文件>          # 不用 git add -A，避免误提交
git commit -m "feat: 中文描述"

# 4. 推远程
git push -u origin feature/简短描述
```

### Commit 格式

```
feat: 实现xxx功能
fix: 修复xxx问题
refactor: 重构xxx
docs: 更新xxx文档
chore: 清理xxx/升级xxx依赖
```

### PR 模板

```
标题：feat: 一句话说明做了什么

## 功能描述
这个功能是什么，怎么用

## 实现思路
技术选型或核心逻辑（简要）

## 测试方式
如何验证功能正常
```

### 禁止

- 不要 push main
- 不要把多个不相关功能塞一个 commit
- 不要用 `git add -A`（避免误提交敏感文件）
- 不要在 PR 描述空白的情况下合并

### 仓库

- origin: https://github.com/huyan1349/MultiPublish
- self: https://github.com/xyh202131/-ContentBridge

---

## 9. 注意事项

- **真实发布**：不模拟、不造假。所有发布操作都是真实的 DOM 注入和按钮点击
- 发布需要用户已在目标平台登录；未登录时 Content Script 会超时并报告失败
- 知乎 Content Script 是当前最完善的参考实现，其他三个平台对齐它
- Sidepanel 代码在单文件中（~730行），继续膨胀需要拆分
- 与 MultiPost 竞品同架构，注意命名差异化 + README 声明
