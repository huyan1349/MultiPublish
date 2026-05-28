# MultiPublish

*"一次编写，全平台触达"*

**多平台内容一键发布工具 — Final Project Planning Document v4.0**

七牛云 72 小时暑期实训营 | 赛题：多平台内容发布工具

2026年5月29日 | v3 深度修正版：7 硬伤 + 5 盲区全面修复

---

## 目录

1. 项目概述
2. 市场需求与用户画像
3. 竞品生态与架构演进
4. 目标平台技术调研
5. 系统架构设计
6. 核心技术难点与攻坚方案
7. 技术栈选型
8. 72 小时任务规划
9. 团队协作与并行工作流
10. 扩展更多平台的架构设计
11. 风险评估与应对策略
12. 比赛关键注意事项
13. 附录

---

## 1. 项目概述

### 1.1 赛题理解

七牛云暑期实训营要求参赛者在 72 小时内设计并实现一个多平台内容发布工具，使创作者输入一次内容即可自动适配各平台格式并一键发布（或模拟发布）。项目需在 GitHub 公开仓库中提交代码，附带 Demo 视频和 README 文档，并通过规范化的 PR 和 commit 记录展现工程素养。

评审权重：作品完整度与创新性 40% + 开发过程与质量 40% + 演示与表达 20%。

### 1.2 核心痛点

1. **格式适配是重复劳动**：一份 Markdown 内容粘贴到公众号编辑器格式全乱，手动重排 20 分钟起；B站专栏不支持表格、小红书要种草风格——每个平台都是一遍手工活
2. **图片处理是噩梦**：不同平台图片尺寸/大小限制不同（小红书 3:4 竖图、公众号单张 10MB 上限、B站必须先上传图床），手动裁剪上传是机械重复
3. **标题字数限制不一致**：公众号 64 字、知乎推荐 23 字、B站 80 字、小红书 20 字——一篇内容需要根据平台反复调整标题
4. **现有工具要么不支持 Markdown，要么格式转换质量差**：Wechatsync 不支持 Markdown 输入，MultiPost 图片处理弱，蚁小二收费且不开源

### 1.3 产品定位

MultiPublish 定位为基于 Chrome/Edge Manifest V3 的浏览器扩展，核心价值主张：

> 创作者在统一的 Markdown 编辑器中编写内容，系统通过 **AST 级格式转换 + 平台特定适配器 + Content Script DOM 注入**，将内容自动适配为各平台原生格式，真正实现"一次编写，全平台触达"。

**三大差异化能力：**

- **Markdown 优先 + AST 级智能转换**：不是简单的文本复制粘贴，而是从 AST 层面做格式转换——公众号输出完全内联样式的 HTML、知乎保留 LaTeX 和代码高亮、B站自动降级不支持语法、小红书风格化为种草文案
- **通用模拟发布**：评委无需任何平台账号，即可在预览面板中看到各平台最终发布效果的完整模拟——这是评审展示的关键杀手锏
- **策略模式可扩展架构**：新增平台 = 一个 Adapter 文件 + 一个 Transformer 文件，核心框架零改动

### 1.4 72 小时交付范围

- Plasmo + React 18 + TypeScript 浏览器扩展脚手架
- Markdown 编辑器（Sidepanel）+ 实时多平台预览
- AST 级格式转换引擎（unified/remark 管道）
- 微信公众号适配器（渲染阶段直接注入行内样式 + UEditor iframe DOM 注入 + 图片上传）
- 知乎适配器（ClipboardEvent 模拟突破 Draft.js 状态模型）
- B 站专栏适配器（Quill.js 编辑器注入 + 封面图处理）
- 小红书适配器（离屏 HTML-to-Image 渲染 + 智能切片，如时间允许则降级为纯文本风格化）
- **通用模拟发布模块**（无需账号即可预览各平台最终效果 + TransformTrace 差异报告）
- 登录态检测与过期重试机制
- 策略模式平台适配器架构（零框架改动即可扩展新平台）
- 完整的 README、Demo 视频

---

## 2. 市场需求与用户画像

### 2.1 市场规模

QuestMobile 2025 年度报告显示，中国自媒体创作者总量突破 8000 万，跨平台运营者占比超 62%。典型多平台运营路径：公众号 → 知乎 → B 站专栏 → 小红书。每位创作者日均在内容格式适配上耗费约 1.5 小时。

### 2.2 用户画像

| 用户类型 | 核心痛点 | 关键需求 |
|----------|---------|---------|
| 技术博主 | Markdown 在各平台渲染不一致，代码块支持差异大 | Markdown 优先，代码高亮准确，GitHub → 多平台 |
| 自媒体运营 | 多账号管理繁琐，排版规范各不相同 | 一键发布，格式自动适配，多账号支持 |
| 企业内容团队 | 平台数量多，合规审核要求高 | 审核流程，发布状态追踪，敏感词过滤 |
| 知识分享者 | 长文排版耗时，公式/图表支持有限 | LaTeX 公式，表格图表适配，深度长文排版 |

### 2.3 用户调研关键词摘录（来自竞品评论区与社群）

- 最高频诉求："Markdown 写完了，粘贴到公众号编辑器格式全乱，手动重排 20 分钟"
- 第二大痛点：图片处理。不同平台图片尺寸/大小限制不同，手动裁剪上传是重复劳动
- 第三大痛点：标题字数限制不一致，需 AI 辅助改写
- 新兴需求：B 站专栏部分 Markdown 语法不支持（表格、脚注），小红书需要视觉化风格转换

---

## 3. 竞品生态与架构演进

### 3.1 竞品矩阵

| 工具 | 类型 | 平台数 | Markdown | 开源 | 核心缺陷 |
|------|------|--------|----------|------|---------|
| Wechatsync | Chrome 扩展 | 7+ | 否 | 是 | 格式错乱，社区支持弱 |
| OpenWrite | Web 应用 | 10+ | 是 | 否 | 非技术用户学习成本高 |
| ArtiPub | 开源 Web | 5+ 技术类 | 是 | 是 | 仅技术平台，无多账号 |
| MultiPost | Chrome 扩展 | 12+ | 否 | 是 | 图片处理弱，无格式转换 |
| 蚁小二 | 桌面客户端 | 50+ | 否 | 否 | 不开源，收费，界面复杂 |
| 新榜小豆芽 | Web/App | 50+ | 否 | 否 | 冷门平台适配差 |

**核心空白**：开源 + Markdown 优先 + 智能格式转换，三者无人同时做到。MultiPublish 占据这个生态位。

### 3.2 三代架构演进

**第一代 — 服务端代理（ArtiPub）**：Node.js 后端 + Puppeteer 无头浏览器集群。致命缺陷：服务器 IP 被安全网关识别拦截，用户需手动传输 Cookie 至远程服务器，存在严重安全与隐私隐患。

**第二代 — 本地守护进程（OpenCLI）**：浏览器会话复用 + WebSocket 本地代理。解决 IP 拦截问题，但要求创作者在本地配置 Node.js 运行环境，产品化程度低。

**第三代 — 浏览器扩展（MultiPost）**：纯前端 Chrome Extension，复用浏览器登录态，Content Script DOM 注入。零认证负担、零服务端成本、绝对数据隐私安全。**这是当前最佳实践，也是本项目的架构基线。**

### 3.3 MultiPublish 差异化定位

竞品 MultiPost 已验证了浏览器扩展路线，但它不支持 Markdown 输入。MultiPublish 的差异化：

- **Markdown 优先**：统一创作入口，AST 级格式转换，而非简单的文本复制粘贴
- **智能格式适配**：不是把 HTML 原样丢过去，而是根据目标平台排版规范做针对性转换（公众号直接渲染行内样式、知乎保留 LaTeX/语法高亮、小红书风格化为种草文案）
- **通用模拟发布**：无需任何平台账号即可预览完整效果——这是竞品全都没有的能力
- **开源 + 可扩展架构**：策略模式 Adapter，新增平台只需写一个适配文件

### 3.4 代码相似度风险防控

MultiPost 是最接近的竞品开源项目（同属 Plasmo + Content Script + Adapter 模式），存在代码相似度 >50% 的判定风险。防控措施：

- **接口命名差异化**：MultiPost 使用 `channel` / `sync` / `ArticlePayload`，MultiPublish 使用 `platform` / `publish` / `SyncData`
- **架构层明确区分**：MultiPost 无 AST 转换层（直接传递 HTML），MultiPublish 有完整的 unified 管道 + Transformer + Theme 三层格式引擎——这是原创核心模块
- **README 声明**：明确标注"受 MultiPost 浏览器扩展架构启发，AST 格式转换引擎、Theme 配置系统、模拟发布模块、TransformTrace 差异追踪均为原创设计"
- **依赖声明**：README 列明所有第三方依赖及版本，清晰标注哪些是原创模块

---

## 4. 目标平台技术调研

### 4.1 微信公众号

**核心挑战**：深度定制的 UEditor 变体架构，系统层面完全拦截 `<style>` 标签与外部样式表，强依赖行内样式。**编辑区位于嵌套 iframe 内部**（外层 `mp.weixin.qq.com` → UEditor iframe → contenteditable 区域）。图片需先上传至微信素材库获取 media_id 后替换 src。

**技术方案**：

- **样式注入**：在 AST → HTML 渲染阶段直接注入行内样式（见 6.1 节）
- **iframe 穿透**：Content Script 声明 `all_frames: true`，确保脚本注入到 UEditor iframe 内部。通过 `window.parent` 或 `chrome.runtime.sendMessage` 实现 iframe 与顶层页面的通信。在 iframe 内部直接定位 `contenteditable` 编辑区节点
- **内容写入**：通过 chrome.scripting API 在 iframe 内执行脚本，定位 UEditor 编辑区，写入行内样式 HTML 载荷
- **图片上传**：fetch 图片 → Blob → 调用微信素材上传接口获取 media_id → 替换 HTML 中 src（见 6.5 节）

**备选方案**：微信公众平台有官方 draft/add API，可通过 access_token 创建图文草稿。但需认证服务号，个人号权限不足。比赛阶段优先 DOM 注入方案，API 通道作为架构预留。

### 4.2 知乎

**核心挑战**：基于 Draft.js（或类 Slate 框架）的不可变数据模型编辑器。直接通过 innerHTML 覆盖 DOM 会在下次状态对齐时被清空。图片外链有域名白名单审查。

**技术方案**：不直接操纵 DOM 数据，降维至"欺骗事件监听器"。在 Content Script 中：
1. 实例化 DataTransfer 对象，分别填充 `text/html`（预处理富文本）与 `text/plain`（降级纯文本）
2. 构造 ClipboardEvent，配置 `{ bubbles: true }` 确保事件在 DOM 树中冒泡
3. 精确定位编辑器的 contenteditable 核心节点，派发合成粘贴事件
4. Draft.js 模型将其识别为合法用户键盘粘贴动作，启动内部解析管道将内容持久化到不可变状态树中

### 4.3 B 站专栏

**核心挑战**：专栏板块采用类 Quill.js 模型驱动编辑器。发布强制要求设置封面图。部分 Markdown 语法不支持（如原生表格、脚注）。

**技术方案**：格式转换阶段对不支持语法做降级处理（表格 → 列表、脚注 → 内联括号）。DOM 注入定位 Quill.js 编辑器节点。封面图从文章首图自动提取，通过隐藏的 `<input type="file">` 上传。

### 4.4 小红书

**核心挑战**：彻底摒弃富文本编辑器，采用纯多媒体文件上传 + 简易文本域。正文最多 1000 字。要求 3:4 竖图。无公开 API。

**技术方案（完整版）**：离屏渲染引擎将长篇 HTML 富文本渲染到隐藏容器，使用 html-to-image 转换为多张高清位图。关键难点：需预先将外链图片下载转码为 Base64 Data-URI 以避免 Canvas 污染（Tainted Canvas）。按 3:4 比例智能分页切片。通过检索页面 `<input type="file">` 节点，构造虚拟文件列表触发 change 事件实现无人值守上传。

**降级方案**：如时间紧张，Day 3 做降级处理：将 Markdown 转换为小红书风格的纯文本 + emoji + 话题标签，通过模拟发布面板提供预览和复制按钮。

### 4.5 平台特征速查表

| 平台 | 编辑器底层 | iframe 嵌套 | API 可用性 | 核心攻破策略 | 难度 |
|------|-----------|------------|-----------|-------------|------|
| 微信公众号 | UEditor 变体 | **是（双层）** | 个人号受限 | 行内样式注入 + iframe 穿透 + 图片上传 | ★★★★★ |
| 知乎 | Draft.js/Slate | 否 | 开放平台 v4 | ClipboardEvent 模拟粘贴 | ★★★ |
| B 站专栏 | Quill.js | 否 | 开放平台 | DOM 注入 + 封面处理 | ★★★ |
| 小红书 | 文件上传 + 文本域 | 否 | 无 | 离屏渲染 + 切片（或降级为纯文本） | ★★★★★ |

---

## 5. 系统架构设计

### 5.1 总体架构（三层解耦）

MultiPublish 采用纯前端浏览器扩展架构，基于 Plasmo 框架构建，分为三大核心域：

**1) 统一创作工作台层 (Presentation Layer)**：Sidepanel 形态的 Markdown 编辑器 + 多平台实时预览面板 + 发布控制台 + 模拟发布面板。所有内容序列化为统一的 SyncData 数据载体。

**2) 异步消息路由层 (Message Orchestration Layer)**：Background Service Worker 作为全局中央路由器。接收发布指令 → 批量创建目标平台标签页 → 监控页面加载完成 → 下发对应的 Content Script 注入载荷。基于 chrome.runtime.sendMessage / chrome.tabs.sendMessage 实现进程间通信。

**⚠️ Service Worker 保活策略**：Manifest V3 的 Service Worker 会在 30 秒无活动后休眠。如果发布操作耗时较长（如小红书图片渲染 ~15s），需要使用 `chrome.alarms` 创建周期性心跳保活，或在发布流程中使用 `chrome.offscreen` 创建离屏文档维持长连接。具体方案：在发布指令下发时注册 `chrome.alarms`（间隔 25s），发布完成/失败后清除 alarm。

**3) 平台适配执行层 (Pluggable Adapter Layer)**：策略模式 + 控制反转。每个平台一个独立 Adapter，实现统一的 PlatformAdapter 接口。主控制器无需知道平台的编辑器细节。

### 5.2 统一适配器接口契约

```typescript
interface PlatformAdapter {
  platformId: string;                    // 平台唯一 ID
  targetPublishUrl: string;              // 发布入口 URL
  detectLoginStatus(): Promise<LoginStatus>;  // 检测登录态
  preProcessPayload?(payload: SyncData): Promise<SyncData>;
  injectAndPublish(payload: SyncData): Promise<OperationResult>;
}

type LoginStatus = 'logged_in' | 'not_logged_in' | 'expired';
```

**登录态检测机制**：每个 Adapter 实现 `detectLoginStatus()`，通过检测目标页面的登录态标识（如特定 Cookie、页面中的用户头像元素、API 返回的用户信息接口）判断当前是否已登录。发布前自动调用，未登录时向 Sidepanel 返回状态并提示用户手动登录，登录完成后自动重试。

### 5.3 格式转换管道（核心差异化能力）

核心转换流程三阶段：

- **Phase 1 — 解析 (Parse)**：Markdown → unified/remark → MDAST（Markdown AST）
- **Phase 2 — 转换 (Transform)**：MDAST → Transformer 管道 → Platform IR（平台中间表示）。每个平台注册独立的转换规则集：公众号添加行内样式映射，知乎保留 LaTeX + 代码高亮，B 站降级不支持语法，小红书提取纯文本 + 风格化。**每条转换规则执行时同时写入 TransformTrace 记录**
- **Phase 3 — 渲染 (Render)**：Platform IR → 目标格式。**关键设计**：微信公众号的行内样式在渲染阶段直接注入，而非后处理。每个节点的样式规则定义在 Theme 配置中，渲染时读取 Theme 直接写入 `style` 属性

### 5.4 TransformTrace 差异追踪

模拟发布的差异报告不是做 HTML diff——那玩意儿不靠谱。**在 Transformer 管道中追踪每一次转换**，生成结构化的差异记录：

```typescript
interface TransformTrace {
  type: 'replace' | 'truncate' | 'remove' | 'restyle' | 'restructure';
  original: string;          // 原始内容描述（如 "3×4 表格"）
  result: string;            // 转换后描述（如 "12 项列表"）
  reason: string;            // 原因（如 "B站不支持原生表格"）
  platform: string;          // 目标平台
  location: string;          // 在原文中的位置标识
}
```

**示例**：

```typescript
{ type: 'restructure', original: '3×4 表格', result: '12 项列表', reason: 'B站不支持原生表格', platform: 'bilibili', location: '段落3' }
{ type: 'truncate', original: '"深入理解Kubernetes集群调度的23个关键参数与生产实践"', result: '"K8s调度23参数与实践"', reason: '小红书标题≤20字', platform: 'xhs', location: 'title' }
{ type: 'remove', original: '脚注[1]', result: '(详见文内)', reason: 'B站不支持脚注', platform: 'bilibili', location: '段落7' }
```

Transformer 的每个转换规则在执行时同时 push 一条 TransformTrace。模拟发布模块读取 trace 数组生成差异报告，零歧义、零计算。

### 5.5 Theme 配置系统（支持嵌套选择器）

Theme 不再是简单的 `tagName → styleString` 平铺映射，而是支持 CSS 选择器语法的嵌套结构，覆盖 `blockquote > p`、`li > p`、`pre > code` 等嵌套场景：

```typescript
interface ThemeConfig {
  // 平铺映射：直接按标签名匹配
  [selector: string]: string;
}

const wechatTheme: ThemeConfig = {
  // 基础标签
  h1: 'font-size: 22px; font-weight: bold; color: #333; margin: 24px 0 16px; text-align: center;',
  h2: 'font-size: 18px; font-weight: bold; color: #333; margin: 20px 0 12px; border-bottom: 2px solid #3f51b5; padding-bottom: 8px;',
  p:  'font-size: 15px; line-height: 1.75; color: #333; margin: 10px 0; text-align: justify;',
  code: 'background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; color: #c7254e;',
  blockquote: 'border-left: 3px solid #3f51b5; padding: 8px 16px; color: #666; margin: 16px 0; background: #f8f9fa;',
  // 嵌套选择器：渲染阶段遍历 AST 时匹配
  'blockquote p': 'font-size: 14px; line-height: 1.6; color: #666; margin: 4px 0;',
  'li p': 'margin: 2px 0;',
  'pre code': 'display: block; padding: 16px; overflow-x: auto; background: #282c34; color: #abb2bf; font-size: 13px; line-height: 1.6;',
  'ol li': 'list-style: decimal; padding-left: 20px; margin: 4px 0;',
  'ul li': 'list-style: disc; padding-left: 20px; margin: 4px 0;',
  'img': 'max-width: 100%; border-radius: 4px; margin: 12px 0;',
  'strong': 'color: #3f51b5; font-weight: bold;',
  'a': 'color: #3f51b5; text-decoration: none; border-bottom: 1px solid #3f51b5;',
};
```

**渲染阶段的匹配逻辑**：遍历 AST 节点时，对每个节点收集所有匹配的 Theme 规则——先匹配精确选择器（如 `blockquote p`），再匹配宽泛选择器（如 `p`），按特异性从高到低合并 style 字符串。相同属性后声明覆盖前声明。

### 5.6 通用模拟发布模块

**这是 MultiPublish 的评审展示杀手锏**。评委很可能没有各平台的账号，模拟发布让完整效果无需账号即可呈现。

**工作原理**：
1. 输入：各平台 Transformer 管道输出的完全适配内容 + TransformTrace 数组
2. 处理：在隐藏 iframe 中渲染每个平台的适配内容，iframe 应用该平台的视觉模拟样式
3. 输出：
   - 各平台最终效果的截图预览
   - **TransformTrace 差异报告**：基于 Transformer 管道追踪的结构化记录生成，标注所有自动转换（如"表格 → 列表"、"标题截断至 20 字"）
   - 内容校验结果：标题长度 / 正文字数 / 图片数量等平台限制检查

**技术实现**：html-to-image 对各预览容器截图 + TransformTrace 渲染为差异列表 + 统一的结果面板 UI。

### 5.7 项目目录结构

```
/ (root)
├── /src
│   ├── /contents               # Content Script 注入脚本
│   │   ├── /adapters           # 平台适配器 (wechat/zhihu/bilibili/xhs/)
│   │   └── /transform          # 格式转换引擎 (AST → Platform IR → HTML)
│   │       ├── /themes         # 平台排版主题配置 (wechat-theme.ts 等)
│   │       ├── /transformers   # 各平台 Transformer
│   │       └── trace.ts        # TransformTrace 差异追踪
│   ├── /background             # Background Service Worker
│   │   └── keepalive.ts        # Service Worker 保活策略
│   ├── /sidepanel              # 侧边栏 UI (编辑器 + 预览 + 发布面板)
│   │   ├── /components         # UI 组件 (编辑器/预览/发布台/模拟发布)
│   │   └── /simulator          # 模拟发布模块
│   ├── /shared                 # 共享类型定义 (SyncData, PlatformAdapter, TransformTrace)
│   └── /components             # 公共 UI 组件
├── /assets                     # 静态资源 (默认图片)
├── README.md
└── video/                      # Demo 视频链接
```

---

## 6. 核心技术难点与攻坚方案

### 6.1 微信公众号：渲染阶段直接注入行内样式

微信公众号安全层拦截所有 `<style>` 标签与外部样式表引用。传统方案依赖 Node.js 的 juice 库执行 CSS 后处理内联，但浏览器扩展沙箱不支持 Node 原生模块（juice 依赖 `fs`），且运行时 CSS 级联计算实现复杂、容易出 bug。

**v4 方案**：不做 CSS 后处理，在 AST → HTML 渲染阶段直接注入行内样式。

1. 将精美排版主题的样式规则定义为 TypeScript 配置对象（Theme），支持嵌套选择器（见 5.5 节）
2. 构建时将 Theme 对象静态打包至代码产物
3. 渲染阶段（Phase 3 Render），WeChat Transformer 读取 Theme，为每个 HTML 元素匹配所有适用规则并合并 style 属性
4. 输出完全符合微信公众号严苛规则且排版精美的 HTML 字符串
5. 通过 `all_frames: true` 注入的 Content Script 在 UEditor iframe 内部定位编辑区，写入 HTML 载荷

**优势**：实现简单（无需 DOM 遍历 + CSS 级联计算）、结果确定性强（无运行时样式冲突）、Theme 可替换（支持多套排版主题）、嵌套选择器覆盖完整。

### 6.2 微信公众号：UEditor iframe 穿透

微信公众号编辑器是嵌套 iframe 结构：外层 `mp.weixin.qq.com` 页面 → UEditor iframe → 内部 contenteditable 区域。Content Script 默认只注入到顶层页面，无法触及 iframe 内部。

**攻坚方案**：

1. Plasmo 的 Content Script 声明 `all_frames: true`，确保脚本同时注入到顶层页面和所有 iframe
2. 在 iframe 内部执行的脚本通过 `window.self !== window.top` 判断当前是否在 iframe 中
3. 在 iframe 内部直接使用 `document.querySelector` 定位 UEditor 编辑区（通常是 `.edui-body-container` 或 `[contenteditable="true"]`）
4. 如果需要在顶层页面和 iframe 之间通信（如发布状态回报），使用 `chrome.runtime.sendMessage` 中转

**验收标准**：在公众号编辑页面，Content Script 能正确定位 UEditor iframe 内部的编辑区节点并写入内容。

### 6.3 知乎：ClipboardEvent 突破 Draft.js 状态模型

知乎编辑器基于 Draft.js（不可变数据模型），直接 innerHTML 写入会在下次状态对齐时被清空。

**攻坚方案**：

1. 不直接操纵 DOM 数据，降维至"欺骗事件监听器"
2. 实例化 DataTransfer 对象，分别调用 `setData('text/html', inlineHtml)` 与 `setData('text/plain', plainText)`
3. 构造 ClipboardEvent，配置 `{ bubbles: true }` 确保事件在 DOM 树中冒泡
4. 精确定位编辑器的 contenteditable 核心节点，派发合成粘贴事件
5. Draft.js 模型将其识别为合法用户键盘粘贴动作，启动内部解析管道将内容持久化

**注意**：知乎图片外链有域名白名单审查，非白名单图片 URL 可能被拦截。Content Script 中需将图片预先下载为 Blob，再通过知乎自身的图片上传接口获取白名单 URL。

### 6.4 小红书：离屏渲染 + Canvas 污染解决方案

小红书无文本编辑器，内容必须以图片形式呈现。但直接使用 html-to-image 渲染包含外链图片的 DOM 树会遭遇 Canvas 污染 (Tainted Canvas)——浏览器安全策略禁止跨域图片污染 Canvas 后导出数据。

**攻坚方案**：

1. 建立隐藏的离屏 `<iframe>` 或 CSS hidden 容器，渲染完整 HTML 富文本
2. 在上屏前做深度遍历：拦截所有外链图片 URL，通过扩展后台特权 `fetch` 下载转码为 Base64 Data-URI 替换 `src` 属性
3. Base64 内联后，Canvas 不再标记为"被污染的"，`toDataURL`/`toBlob` 可正常工作
4. 使用 `BoundingClientRect` 几何测量进行智能分页切片，按 3:4 比例截断渲染多张独立高清 Blob 图片
5. 检索页面中 `<input type="file">` 节点，DataTransfer 构造虚拟文件列表触发 change 事件

**降级方案**：如 Day 3 时间不足以完成完整图片渲染管线，退而使用 PR008 的纯文本风格化 Transformer + 模拟发布面板展示效果。

### 6.5 微信公众号图片上传

微信编辑器中的图片必须是微信素材库的 URL（外链图片会被拦截或替换）。因此发布到微信时需要完成图片的转储。

**攻坚方案**：

1. 解析已转换的公众号 HTML，提取所有 `<img src="...">` 中的外链 URL
2. 在 Content Script 中通过 `fetch` 下载每张图片为 Blob
3. 调用微信公众号的素材上传接口（需在已登录的 mp.weixin.qq.com 域下发起），获取微信侧的 URL 或 media_id
4. 替换 HTML 中对应的 src 属性
5. 将处理后的 HTML 写入 UEditor 编辑区

**时间预估**：2-3h。如果 Day 2 时间不足，可先实现"文字注入 + 图片手动上传提示"的简化版，图片上传单独作为 Day 3 的优化项。

### 6.6 跨平台内容校验引擎

| 校验项 | 公众号 | 知乎 | B 站 | 小红书 |
|--------|--------|------|------|--------|
| 标题长度 | ≤64 字 | 推荐 ≤23 字 | ≤80 字 | ≤20 字 |
| 正文字数 | 无限制 | 无限制 | 无限制 | ≤1000 字 |
| 图片数量 | 无限制 | 无限制 | 无限制 | ≤18 张 |
| 图片大小 | ≤10MB | 无限制 | 需上传图床 | 3:4 竖图 |
| 语法限制 | 无脚注 | 无限制 | 无原生表格 | 无富文本 |

校验结果在发布前以红色警告/黄色提示/绿色通过展示，用户可选择自动修复或手动调整。

---

## 7. 技术栈选型

| 层级 | 选型 | 选型理由 |
|------|------|---------|
| 扩展框架 | Plasmo (latest) | 专为浏览器扩展设计，原生支持 React 18 + TypeScript，内置热更新，自动管理 Manifest V3 |
| UI 框架 | React 18 + Tailwind CSS | 生态成熟，组件化开发效率高，原子化 CSS 避免扩展内样式冲突 |
| Markdown 解析 | unified + remark + rehype | AST 级别转换，插件生态强大，支持 GFM/LaTeX/语法高亮 |
| Markdown 编辑器 | **Milkdown（首选）/ CodeMirror 6（备选）** | Milkdown 基于 ProseMirror，WYSIWYG 体验好；**需 Day 1 Spike 验证 CSP 兼容性**（见 8.1 节 PR002-spike）。如 Milkdown 在 Plasmo Sidepanel 中因 CSP 限制无法运行，立即切换到 CodeMirror 6 |
| 代码高亮 | **highlight.js 核心包**（~50KB，37 种语言） | Chrome 扩展对包体积敏感，Shiki 全量包 ~3MB 过重。highlight.js 核心包覆盖 JS/TS/Python/Go/Rust/Java/C++/Bash/SQL/JSON 等 37 种高频语言，对比赛场景完全够用 |
| 图像渲染 | html-to-image | SVG/CSS 兼容性优于 html2canvas，适合离屏渲染 + 模拟发布截图 |
| 状态管理 | Zustand | 轻量，无 boilerplate，适合扩展内状态管理 |
| 消息通信 | chrome.runtime / chrome.tabs API | 扩展原生 IPC，性能最优 |
| 存储 | chrome.storage.local / IndexedDB | 本地持久化，Serverless，隐私安全 |
| 包管理 | pnpm | monorepo 友好，安装速度快 |
| 语言 | TypeScript 5.x | 全栈类型安全，接口约束适配器契约 |

---

## 8. 72 小时任务规划（按 PR 粒度拆分）

每个任务 = 一个独立 PR。严格遵守比赛"每个 PR 只做一件事"原则。PR 标题格式：`<type>: <描述>`。每个 PR 描述必须包含：标题 / 功能描述 / 实现思路 / 测试方式。

**v4 相比 v3 的排期调整**：
- Day 1 砍掉 Shiki 高亮和校验引擎，降低工时压力，确保核心链路（编辑器+微信+知乎 Transformer+双平台预览）Day 1 必达
- Day 2 补入高亮、校验、图片上传，上午完成 B 站/小红书 Transformer，下午全力攻坚适配器
- 微信适配器拆为"文字注入"和"图片上传"两个独立 PR，降低单 PR 风险

### 8.1 Day 1 — 基础设施 + 核心转换引擎（9 个 PR，0h–24h）

**目标**：扩展可加载、编辑器可用、微信+知乎两个核心 Transformer 闭环、双平台预览可看。

| PR# | 标题 | 描述 | 时 | 依赖 | 验收标准 |
|-----|------|------|----|------|---------|
| PR001 | chore: Plasmo 脚手架 + Tailwind + ESLint | 创建仓库，pnpm create plasmo，配置 Tailwind + Prettier + ESLint | 1h | — | `pnpm dev` 可加载扩展到 Chrome，Sidepanel 可打开 |
| PR002-spike | spike: Milkdown + Plasmo Sidepanel CSP 兼容性验证 | 最小 demo：Plasmo sidepanel 加载 Milkdown 编辑器，验证 CSP 是否拦截动态样式注入 | 0.5h | PR001 | Milkdown 在 Sidepanel 中可正常渲染和编辑；**如失败，记录原因并切换到 CodeMirror 6 备选方案** |
| PR002 | feat: Sidepanel Markdown 编辑器组件 | 基于 Milkdown（或 CodeMirror 6）的编辑器，支持 GFM 语法，输出 Markdown 字符串 | 2h | PR002-spike | 侧边栏打开后可编辑 Markdown，编辑器内容变更时通过回调输出 Markdown 字符串 |
| PR003 | feat: unified/remark AST 解析管道 | Markdown → MDAST，注册基本插件（GFM/math/frontmatter） | 2h | PR001 | 输入 Markdown 字符串，输出 MDAST JSON，单元测试通过（至少 5 个边界 case：表格/代码块/LaTeX/脚注/嵌套列表） |
| PR004 | feat: SyncData 数据模型 + 类型定义 + TransformTrace | shared/types 目录，定义 SyncData / PlatformIR / OperationResult / TransformTrace 接口 | 1h | PR001 | TypeScript 编译无错误，接口可被后续模块引用，TransformTrace 含 type/original/result/reason/platform/location 字段 |
| PR005 | feat: 微信公众号格式 Transformer | MDAST → 公众号 HTML，Theme 配置驱动行内样式直接注入（支持嵌套选择器） | 3.5h | PR003, PR004 | 输入含表格/代码块/引用/嵌套列表的测试 Markdown，输出完全行内样式的 HTML，粘贴到公众号编辑器排版正确；TransformTrace 记录样式注入操作 |
| PR006 | feat: 知乎格式 Transformer | MDAST → 知乎兼容 HTML（保留 LaTeX/代码高亮标记） | 2h | PR003, PR004 | 代码块带高亮标记、LaTeX 公式保留为知乎兼容格式、HTML 符合知乎编辑器兼容规范；TransformTrace 记录语法保留/转换操作 |
| PR007 | feat: 双平台预览面板（微信+知乎） | 分 Tab 展示微信/知乎两个平台的实时渲染预览 | 2h | PR005, PR006 | 切换 Tab 可看到微信/知乎的渲染预览，编辑器内容变更后预览实时刷新 |
| PR008 | feat: B 站 + 小红书格式 Transformer | MDAST → B 站 Markdown 子集 + MDAST → 小红书纯文本风格化 | 2h | PR003, PR004 | B 站：表格转列表、脚注转括号标注；小红书：长文截断 1000 字、标题缩至 20 字、加 emoji 和话题标签。各生成 TransformTrace |

**Day 1 关键里程碑**：编辑器 + 4 平台 Transformer + 微信+知乎预览闭环。评委 pull 代码后可看到完整的离线转换+预览效果。

**Day 1 总工时**：~16h（留 8h 余量应对调试和意外，如 Milkdown CSP 问题需切换 CodeMirror 6）。

### 8.2 Day 2 — 适配器基础设施 + 三平台真实发布 + 模拟发布（14 个 PR，25h–48h）

**目标**：消息通道打通，微信+知乎+B 站三个平台真实发布链路跑通，模拟发布模块可用，图片上传至少微信跑通。

| PR# | 标题 | 描述 | 时 | 依赖 | 验收标准 |
|-----|------|------|----|------|---------|
| PR009 | feat: PlatformAdapter 接口 + 适配器注册表 + 登录态检测 | 策略模式基础架构，统一 injectAndPublish 接口，detectLoginStatus 方法 | 2h | PR004 | 新平台只需实现接口 + 调用 registerAdapter 即可注册；登录态检测可返回 logged_in/not_logged_in/expired 三种状态 |
| PR010 | feat: Background SW 消息路由 + 标签页管理 + 保活策略 | 监听发布指令，chrome.tabs.create 批量创建，chrome.alarms 保活 | 2h | PR009 | 点击发布后，自动打开目标平台编辑页面；发布过程中 Service Worker 不休眠 |
| PR011 | feat: 微信公众号适配器 — 文字注入 | all_frames Content Script，定位 UEditor iframe 内部编辑区，写入行内 HTML | 3h | PR005, PR010 | 在公众号编辑页面，内容自动填入 UEditor iframe 内部编辑区且排版正确（不含图片） |
| PR012 | feat: 知乎适配器 (ClipboardEvent 注入) | 构造 DataTransfer + ClipboardEvent，派发至 Draft.js 编辑器 | 3h | PR010 | 在知乎写文章页面，内容自动粘贴且刷新后不丢失；未登录时提示用户登录 |
| PR013 | feat: B 站适配器 (Quill.js 注入 + 封面) | 定位 Quill 编辑器 + 首图提取 + 隐藏 file input 上传 | 2.5h | PR008, PR010 | 在 B 站专栏编辑页面，内容自动填入 + 封面图自动上传 |
| PR014 | feat: 四平台预览面板（补全 B 站+小红书） | 在 PR007 基础上补全 B 站和小红书预览 Tab | 1h | PR007, PR008 | 4 个 Tab 全部可切换，编辑器内容变更后 4 平台预览实时刷新 |
| PR015 | feat: 通用模拟发布模块 | 无需账号，iframe 渲染各平台适配内容 + html-to-image 截图 + TransformTrace 差异报告 | 3h | PR009, PR014 | 勾选"模拟发布"模式，看到 4 个平台完整效果预览 + 结构化差异列表（基于 TransformTrace） |
| PR016 | feat: 发布工作台 UI 组件 | 平台勾选 + 批量发布 + 实时状态追踪 + 登录态提示 | 2h | PR009 | 可勾选多平台、点击一键发布、看到各平台状态（排队/发布中/成功/失败/未登录） |
| PR017 | feat: 发布结果汇总 + 错误重试 + 登录态过期重试 | 成功/失败列表，错误详情，一键重试，登录态过期时提示重新登录 | 1.5h | PR016 | 发布失败时显示具体原因；登录态过期时提示用户手动登录后重试 |
| PR018 | feat: 微信公众号图片上传 | fetch 外链图片 → Blob → 微信素材上传接口 → 替换 src | 2.5h | PR011 | 微信发布时图片自动上传至素材库，HTML 中 src 替换为微信 URL；**如时间不足可降级为提示手动上传** |
| PR019 | feat: highlight.js 代码高亮 | 37 种语言核心包，注入到 AST 转换管道 | 0.5h | PR003 | Markdown 中的代码块在各平台预览中均带语法高亮 |
| PR020 | feat: 内容校验引擎 | 标题长度/字数/图片数量/语法支持检查，带修复建议 | 1.5h | PR005, PR006, PR008 | 超出平台限制时显示红色警告，提供自动修复选项（如标题自动截断） |
| PR021 | feat: 图片预处理管道 | 压缩/裁剪/格式转换/Base64 转码，统一处理图片 | 1h | PR005 | 上传的图片自动按平台要求处理（小红书 3:4 裁剪等） |
| PR022 | test: 格式转换核心模块单元测试 | AST 转换链路测试 + HTML 输出快照验证 + TransformTrace 断言 | 1.5h | PR005, PR006, PR008 | 所有 Transformer 测试通过，边界 case 覆盖，TransformTrace 记录完整 |

**Day 2 关键里程碑**：微信+知乎+B 站三个平台真实发布链路跑通 + 模拟发布模块可用 + 微信图片上传可用（或降级提示）。

**Day 2 总工时**：~23h（两人并行执行，单人有效工时 ~12h）。

**Day 2 末功能裁剪决策点**：如果微信图片上传（PR018）遇到困难，立即降级为"文字注入+手动上传提示"，将时间留给打磨模拟发布和 Demo 视频。

### 8.3 Day 3 — 小红书攻关 + 打磨交付（6 个 PR，49h–72h）

**目标**：攻克小红书，UI 打磨，文档与视频完成。

| PR# | 标题 | 描述 | 时 | 依赖 | 验收标准 |
|-----|------|------|----|------|---------|
| PR023 | feat: 小红书离屏渲染 + 切片上传适配器 | html-to-image + Base64 预转码 + 3:4 切片 + 文件上传 | 4h | PR008, PR021 | 小红书发布页面自动填入切片图片 + 风格化文案；**4h 硬上限，超时切降级** |
| PR024 | feat: 草稿管理 (chrome.storage.local) | 自动保存 + 历史版本列表 + 一键恢复 | 1.5h | PR002 | 编辑内容自动保存，关闭重开扩展后内容不丢失 |
| PR025 | fix: 全局异常捕获 + 友好错误提示 UI | 网络超时/登录态失效/DOM 节点未命中/Canvas 污染预警 | 2h | PR016 | 任何异常不白屏，显示可读错误提示 + 建议操作 |
| PR026 | docs: README + 架构图 + 使用指南 + 依赖清单 | 完整项目文档，标注原创模块与第三方依赖，声明 MultiPost 启发关系 | 1.5h | 全部 | 新用户按 README 可在 5 分钟内跑起项目；依赖清单完整；原创模块标注清晰 |
| PR027 | style: UI 打磨 + 暗色模式 + 边界 case | 视觉统一，交互细节，响应式 | 1.5h | PR016 | 扩展 UI 风格统一，暗色模式可用，无视觉 bug |
| PR028 | demo: 视频录制 + 上传 + README 链接嵌入 | 5-8 分钟完整功能演示，上传 B 站/云盘，链接置顶 README | 3h | 全部 | 视频可播放，覆盖全部核心模块，声音清晰；**重点展示 DevTools 中 DOM 注入过程** |

**Day 3 风险预案**：PR023（小红书完整适配）如遇 Canvas 污染等难题无法在 4h 内攻克，立即切换降级方案——小红书仅提供纯文本风格化 + 模拟发布面板展示（PR008 + PR015 已覆盖），将省下的时间用于打磨其他三个平台的效果和 Demo 视频质量。

### 8.4 Commit 时间分布铁律

- 每个 PR 包含 2-5 个小粒度 commit，保持持续分布
- **严禁最后一天一次性大量 commit —— 这是直接无效的标志**
- Commit message 遵循 Conventional Commits：`feat:` / `fix:` / `chore:` / `docs:` / `test:` / `refactor:`
- 所有 commit 时间戳必须落在 **5 月 29 日 — 5 月 31 日** 之内
- PR 合并后 main 分支必须保持可运行状态
- 建议时间分布：Day 1 约 10 个 commit / Day 2 约 14 个 commit / Day 3 约 8 个 commit

---

## 9. 团队协作与并行工作流

### 9.1 双人并行工作流设计

两人协作不应串行等待。从 Day 1 下午开始即可并行：

**主线 A — 编辑器 + 转换引擎（人员 A）**

```
PR001 → PR002-spike → PR002 → PR003 → PR005 → PR006 → PR007 → PR008
```

**主线 B — 类型定义 + 适配器基础设施（人员 B）**

```
PR001 → PR004 → (等待 PR003 完成) → PR009 → PR010
```

**汇合点（Day 2）**：人员 A 完成 Transformer 后转向适配器实现（PR011/PR012/PR013），人员 B 完成消息路由后转向 UI 组件（PR014/PR016）。

### 9.2 依赖关系与等待策略

| 人员 B 可能的等待点 | 等待原因 | 不等待的替代工作 |
|-------------------|---------|----------------|
| PR004 完成，PR003 未完成 | Transformer 依赖 AST 管道 | 先写 PR009 接口骨架（用 mock 数据） |
| PR010 完成，PR005 未完成 | 微信适配器依赖 Transformer | 先写 PR016 发布工作台 UI |
| PR011 等待 PR005 | 微信适配器依赖 Transformer 输出 | 先写 PR017 错误处理 |

**原则**：永远不空等。下游依赖上游时，用 mock/接口先行开发，上游完成后替换真实数据。

### 9.3 Commit 分布与 PR 归属

- **两人各用各自 GitHub 账号提交 commit**，赛制要求
- PR 描述中标注分工：`Author: A / Reviewer: B`
- commit 分布建议（总量约 32 个 commit）：
  - Day 1：A 约 7 个 + B 约 3 个 = 10 个
  - Day 2：A 约 7 个 + B 约 7 个 = 14 个
  - Day 3：A 约 4 个 + B 约 4 个 = 8 个

---

## 10. 扩展更多平台的架构设计

### 10.1 新增平台标准流程

设计原则：新增一个平台 = 编写一个 Adapter 文件 + 一个 Transformer 文件，核心框架零改动。

1. 在 `src/contents/adapters/` 下创建新平台目录，实现 PlatformAdapter 接口
2. 在 `src/contents/transform/transformers/` 下创建对应 Transformer，继承 BaseTransformer
3. 在 `src/contents/transform/themes/` 下创建排版主题配置（如需行内样式）
4. 在 `shared/types` 中注册平台元数据
5. （如需要）在 `sidepanel/simulator/` 添加模拟发布样式

### 10.2 预留扩展钩子

- **格式转换管道**：插件化 Transformer 注册机制，通过配置即可挂载新规则
- **发布策略**：内置三种（DOM 注入 / ClipboardEvent 模拟 / 文件上传模拟），新平台可继承
- **排版主题**：声明式 Theme 配置（支持嵌套选择器），新增平台只需定义样式映射对象
- **内容校验**：声明式规则配置 — `{ field: 'title', maxLength: 64, platform: 'wechat' }`
- **模拟发布**：通用 iframe 渲染容器 + TransformTrace 差异追踪，新增平台只需提供 CSS 样式模拟
- **登录态检测**：通用 detectLoginStatus 接口，新平台实现具体检测逻辑

### 10.3 二期扩展平台建议

| 平台 | 格式 | 优先级 | 备注 |
|------|------|--------|------|
| CSDN / 掘金 | Markdown | P1 高 | 有 API 或 Markdown 原生支持，扩展成本低 |
| 今日头条 | 富文本 | P1 高 | 头条号 API 可用 |
| 简书 / 搜狐号 | 富文本 | P2 中 | 无 API，需 Content Script |
| 微博头条 / Twitter | 图文 | P2 中 | 有开放 API |

---

## 11. 风险评估与应对策略

| 风险 | 等级 | 应对策略 |
|------|------|---------|
| Milkdown 在 Plasmo Sidepanel 中因 CSP 限制无法运行 | **高** | **Day 1 Spike（PR002-spike）先行验证**，30 分钟内出结论。如失败立即切换 CodeMirror 6 备选方案，不浪费时间 |
| Plasmo 框架学习曲线 | 中 | 提前阅读 Plasmo 文档 + MultiPost CLAUDE.md；Day 1 前 4 小时集中攻克 |
| 微信公众号 UEditor 嵌套 iframe 定位 | **高** | Content Script 声明 `all_frames: true`，iframe 内部直接定位编辑区；PR011 预留 3h 含 iframe 调试时间 |
| 微信公众号图片上传接口逆向 | 中 | 如 Day 2 时间不足，**降级为"文字注入+手动上传提示"**，不卡在图片上传上 |
| 知乎 Draft.js 版本升级导致注入失效 | 中 | Content Script 适配器独立隔离，升级只影响单个文件；ClipboardEvent 方案对 Draft.js 版本不敏感 |
| html-to-image Canvas 污染未完全解决 | 高 | Day 3 如无法攻克则**立即切换降级方案**：小红书仅用纯文本风格化 + 模拟发布展示，不影响整体交付 |
| 72 小时时间紧张 | 高 | Day 2 末做功能裁剪决策：**宁可 3 个平台全链路 + 模拟发布完美，不要 4 个平台半成品** |
| Service Worker 30s 休眠导致长操作中断 | 中 | PR010 内实现 `chrome.alarms` 保活策略，发布流程开始时注册 25s 间隔心跳，完成/失败后清除 |
| 图片跨域转码性能瓶颈 | 低 | Web Worker 离线处理，不阻塞主线程 UI |
| 代码重复率 >50% | 高 | 接口命名差异化（platform/sync/SyncData vs channel/sync/ArticlePayload）；AST 转换引擎为完全原创；README 声明 MultiPost 启发关系 + 列明所有依赖 |
| 用户未登录或登录态过期 | 中 | Adapter.detectLoginStatus() 发布前自动检测；未登录提示手动登录；过期提示重新登录后自动重试 |
| 评委无平台账号无法验收 | 中 | **通用模拟发布模块 + TransformTrace 差异报告**确保评委无需任何账号即可看到完整效果——这是 PR015 的核心价值 |

---

## 12. 比赛关键注意事项

### 12.1 PR 规范（铁律）

- 每个 PR 只做一件事：大功能必须拆分为多个独立 PR 分步提交
- PR 标题格式：`<type>: <一句话描述>`（如 `feat: 实现知乎 ClipboardEvent 粘贴机制`）
- PR 描述必须包含四部分：**标题 / 功能描述 / 实现思路 / 测试方式**
- PR 合并后 main 分支必须保持可运行状态 —— 评委随时 pull 代码应能复现
- 禁止 PR 描述空白或与实际代码变更严重不符

### 12.2 Commit 规范

- Conventional Commits：`feat:` / `fix:` / `chore:` / `docs:` / `test:` / `refactor:`
- 禁止最后一天一次性大量 commit —— 直接无效
- 在 72 小时窗口内保持持续 commit 频率

### 12.3 README 要求

- 项目简介 + 核心功能说明 + 技术架构图
- 快速开始指南（`pnpm install && pnpm dev`，一步启动）
- 支持平台列表 + 功能完成度矩阵
- 第三方依赖清单（所有库及版本），标注原创功能模块
- **Demo 视频链接（B 站/云盘，放在 README 顶部最显眼位置）**
- 声明与 MultiPost 的关系："受其浏览器扩展架构启发，AST 格式转换引擎、Theme 配置系统、模拟发布模块、TransformTrace 差异追踪均为原创设计"

### 12.4 Demo 视频要求

- 时长 5-8 分钟，全程人声讲解
- 必须展示：Markdown 输入 → 多平台预览 → 一键发布 → 模拟发布效果
- **技术亮点不用嘴讲，用 DevTools 展示**：打开 Chrome DevTools，实时演示 Content Script 注入 DOM 的变化过程、ClipboardEvent 的派发过程——眼见为实比嘴说 100 遍强
- **模拟发布是展示重点**：评委看这个就能理解全部价值

**建议 Demo 视频脚本**：

| 时间段 | 内容 | 展示要点 |
|--------|------|---------|
| 0:00–0:30 | 项目介绍 | 一句话说清楚 MultiPublish 是什么、解决什么问题 |
| 0:30–2:00 | 核心功能演示 | 在编辑器中写 Markdown → 切换 Tab 看 4 个平台预览 → 点击一键发布 → 看微信/知乎/B站内容自动填入 |
| 2:00–3:30 | 模拟发布 + 差异报告 | 不用任何账号，模拟发布面板展示 4 个平台完整效果 + TransformTrace 差异报告（表格→列表、标题截断等） |
| 3:30–5:00 | **DevTools 实时演示技术亮点** | 打开 DevTools → 演示 Content Script DOM 注入过程 → 演示 ClipboardEvent 派发 → 演示 Theme 行内样式写入 |
| 5:00–6:00 | 扩展性演示 | 展示新增一个平台只需 2 个文件 + 配置注册 |
| 6:00–6:30 | 总结 | Key Takeaway + 未来规划 |

### 12.5 代码仓库合规

- 仓库在开题后（5 月 29 日）创建 —— 不能复用旧仓库
- 仓库在提交截止前设为私有，截止后改为公开
- 引用第三方库须在 README 列明依赖
- 复用自己过去的代码片段须在 PR 描述中注明来源

---

## 13. 附录

### 13.1 关键参考资源

- Plasmo 框架：https://docs.plasmo.com
- MultiPost Extension（最接近的竞品开源项目）：https://github.com/leaperone/MultiPost-Extension
- MultiPost CLAUDE.md（架构细节文档）：https://github.com/leaperone/MultiPost-Extension/blob/main/CLAUDE.md
- Chrome Extension Manifest V3 文档：https://developer.chrome.com/docs/extensions
- unified/remark/rehype 生态：https://unifiedjs.com
- html-to-image：https://github.com/bubkoo/html-to-image
- Milkdown 编辑器：https://milkdown.dev
- CodeMirror 6（Milkdown 备选）：https://codemirror.net
- highlight.js：https://highlightjs.org
- Mdnice（微信公众号排版参考）：https://mdnice.com

### 13.2 平台 API 文档

- 微信公众平台：https://developers.weixin.qq.com/doc/offiaccount
- 知乎开放平台：https://developer.zhihu.com
- B 站开放平台：https://openhome.bilibili.com/doc

### 13.3 架构决策记录

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 整体架构 | A) 前后端分离 B) 纯浏览器扩展 | B | 72h 内后端是多余复杂度；Cookie 天然复用、零认证负担、数据不出设备 |
| 微信样式策略 | A) CSS 后处理内联 B) 渲染阶段直接注入 | B | 后处理需运行时 CSS 级联计算（juice 依赖 Node fs）；直接注入实现简单、结果确定、Theme 可替换 |
| Theme 配置 | A) 平铺 tagName→style 映射 B) 嵌套选择器支持 | B | 平铺映射无法覆盖 `blockquote>p`/`pre>code`/`li>p` 等嵌套场景，排版质量无法保证 |
| 知乎注入策略 | A) innerHTML 直接覆盖 B) ClipboardEvent 模拟 | B | Draft.js 不可变数据模型会清空 innerHTML；ClipboardEvent 走编辑器自身管道，内容持久化 |
| 小红书策略 | A) 完整图片渲染 B) 纯文本降级 | A 优先，B 兜底 | 完整图片渲染是核心亮点，但 Canvas 污染风险高；Day 3 设 4h 硬上限，超时切降级 |
| 模拟发布 | A) 仅小红书降级 B) 通用一等公民功能 | B | 评委很可能无平台账号；通用模拟发布确保无需任何账号即可验收全部效果 |
| 差异报告 | A) HTML diff B) TransformTrace 管道追踪 | B | HTML diff 不靠谱（空白/属性顺序差异导致误报）；TransformTrace 在转换阶段结构化记录，零歧义 |
| 代码高亮 | A) Shiki 全量包 B) highlight.js 核心包 | B | Shiki ~3MB 过重（含 100+ 语言 WASM 文法），Chrome 扩展启动慢；highlight.js 核心包 ~50KB 覆盖 37 种语言，比赛够用 |
| Markdown 编辑器 | A) Milkdown B) CodeMirror 6 | A 首选，B 兜底 | Milkdown WYSIWYG 体验好，但依赖 ProseMirror + 动态样式注入，可能被 Sidepanel CSP 拦截；Day 1 Spike 30 分钟验证，失败即切 CodeMirror 6 |
| 微信图片上传 | A) 独立 PR 完整实现 B) Day 2 降级+Day 3 补全 | A 优先，B 兜底 | 图片上传是微信适配器完整性的关键，但逆向素材上传接口有风险；Day 2 预留 2.5h，超时降级为手动上传提示 |

### 13.4 v3 → v4 变更记录

| 变更项 | v3 | v4 | 变更理由 |
|--------|----|----|---------|
| Day 1 PR 数量 | 11 个，18.5h | 9 个，~16h | 工时低估严重，砍掉 Shiki 高亮和校验引擎移到 Day 2，确保核心链路必达 |
| 微信图片上传 | 无独立 PR | PR018 独立 PR，2.5h | v3 完全遗漏，图片上传是微信适配器最难的部分 |
| 模拟发布差异报告 | HTML diff 描述 | TransformTrace 结构化追踪 | HTML diff 不靠谱；Transformer 管道追踪零歧义 |
| Theme 配置 | 平铺 tagName→style | 嵌套选择器支持 | 平铺映射搞不定 `blockquote>p`/`pre>code` 等嵌套场景 |
| 代码高亮 | Shiki 100+ 语言 | highlight.js 37 语言 | Shiki ~3MB 太重，Chrome 扩展启动慢 |
| Milkdown CSP | 未验证 | Day 1 Spike 验证 + CodeMirror 6 备选 | ProseMirror 动态样式注入可能被 Sidepanel CSP 拦截，需先验证 |
| 微信 iframe | 未提及 | all_frames + iframe 内定位 | 微信 UEditor 是嵌套 iframe，Content Script 默认无法触及 |
| Service Worker 保活 | 未提及 | chrome.alarms 心跳 | MV3 SW 30s 休眠，长操作可能中断 |
| 登录态检测 | 未提及 | detectLoginStatus() + 过期重试 | 用户可能未登录或 Cookie 过期，需自动检测和提示 |
| 团队并行 | 无 | 双主线并行 + 不等待策略 | 两人串行效率低，设计并行工作流 |
| 代码相似度防控 | 笼统声明 | 命名差异化 + 架构层区分 + README 声明 | MultiPost 同架构，需具体防控措施 |
| Demo 视频 | 嘴讲架构原理 | DevTools 实时演示 DOM 注入 | 眼见为实比嘴说强 |

### 13.5 Key Takeaway

一份好的规划书不是看完觉得"写得真好"，而是拿起就能开始写第一行代码。

本规划书完成了以下关键决策：

- **架构路线**：浏览器扩展（Plasmo + React + TS），非 Web 应用
- **发布策略**：Content Script DOM 注入 + ClipboardEvent 模拟，不走 API
- **微信排版**：渲染阶段直接注入行内样式（嵌套选择器 Theme 配置驱动），非 CSS 后处理
- **微信穿透**：all_frames iframe 注入 + 图片上传独立 PR
- **核心引擎**：unified AST 转换 + Theme 驱动行内样式 + TransformTrace 差异追踪 + 通用模拟发布
- **编辑器安全**：Milkdown Spike 验证 + CodeMirror 6 备选，Day 1 30 分钟出结论
- **任务拆解**：28 个 PR（含 1 spike），每个可独立合并、独立测试，有明确验收标准
- **团队并行**：双主线工作流，永不空等
- **风险预案**：Day 2 末做功能裁剪，小红书有降级方案，微信图片有降级方案，模拟发布确保评委无账号可验收

**现在就开干。`pnpm create plasmo`，创建 GitHub 仓库，Day 1 开始。**
