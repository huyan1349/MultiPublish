# Handoff — 2026-05-30

## 已完成

### Feature 1: Web ↔ Browser Extension Connection
- **extensionBridge.ts** 增强：新增 `waitForExtension(timeoutMs)`、`getExtensionStatus()`、`ExtensionStatus` 接口；`checkExtensionHealth()` 现在会缓存状态到 `cachedStatus`
- **useExtensionStatus.ts** hook：每5秒轮询扩展健康状态，返回 `{ available, version?, checking }`
- **Editor.tsx** 更新：
  - 新增 `ExtensionIndicator` 组件，三态显示（绿点 EXT CONNECTED / 红点 NO EXT / 黄点 CHECKING…）
  - 发布流程改为 `checkExtensionHealth()` 异步检测，失败时给出安装指引
  - PlatformCard 调用对齐完整接口（draftTitle, draftHtmlContent, beautifiedContent, onBeautifyStart/Complete/Error, onApplyBeautified）

### Feature 2: Settings Page
- **Settings.tsx** 创建：版本信息、扩展状态、AI配置、Auto-save开关、About
- **App.tsx** 添加 `/settings` 路由
- **Sidebar.tsx** 添加 Settings 齿轮图标导航项

### Bug 修复
- contentStore.ts 补充缺失的 `saveToStorage` / `loadFromStorage` 实现
- PlatformCard.tsx 修复 `ringColor` 无效 CSS 属性 → 改用 `outline`
- PlatformCard.tsx 修复 `beautifiedContent` 未定义变量 → 改用 `hasBeautified` state

## 未完成 / 待后续
- Auto-save 开关仅 UI，未接入实际自动保存逻辑（需配合 contentStore.saveToStorage + debounce）
- DeepSeek API 状态在 Settings 页写死为 CONNECTED，应改为实际检测
- 扩展版本号在 Settings 页显示依赖 HEALTH_CHECK 返回 version 字段
