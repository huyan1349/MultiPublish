# Handoff — 2026-05-30

## 已完成
- 小红书 closed Shadow DOM 穿透（xiaohongshu-shadow.ts: MAIN world + document_start 拦截 attachShadow）
- 小红书发布按钮点击（DOM attribute 跨世界通信: data-xhs-click-publish / data-xhs-publish-result）
- 公众号自动发布（autoLayout 开关 + tryAutoPublish + checkLogin）
- 公众号 tab 复用避免 session 丢失（background.ts findExistingPlatformTab）
- sidepanel.tsx autoLayout 开关（小红书+公众号）
- hasPublishSuccessSignal bug 修复
- 设置页公众号状态更新为"完整发布链路"
- 版本号 v1.2.0
- 构建验证通过，打包产物检查通过

## 未完成
- B站自动发布（不要动，另一个AI在写）
- SW 保活策略（chrome.alarms）
- 登录态检测优化（其他平台）
- 微信图片上传
- AST 格式转换
- Sidepanel 拆分
- 草稿自动保存

## 当前分支
feature/xiaohongshu-publish-click（4个commit，已push到origin）

## 关键架构
- MAIN world 脚本由 Plasmo 自动通过 chrome.scripting.registerContentScripts 注册
- 小红书发布按钮在 xhs-publish-btn 的 closed Shadow DOM 中，只能通过 __shadowRoot__ 访问
- 公众号 session 与 tab 绑定，必须复用已登录 tab
