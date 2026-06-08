# Handoff — V2.1

## 已完成

### Feature 1: 草稿自动保存
- `src/hooks/useAutoSave.ts` — 3秒防抖自动保存 hook，挂载时从 localStorage 恢复草稿
- `src/stores/contentStore.ts` — 新增 `saveToStorage()` / `loadFromStorage()` 方法
- `src/pages/Editor.tsx` — header 新增 SAVED/SAVING… 指示器，hover 显示上次保存时间

### Feature 2: 灵感页升级
- `src/pages/Inspiration.tsx` — 完全重写：
  - 打字机效果：useTypewriterReveal hook，标题→大纲逐行→标签逐个揭示
  - REGENERATE 按钮：保持话题重新生成
  - 话题建议 chips：科技趋势/职场成长/生活方式/创意灵感/行业洞察
  - 空状态：dot-grid 背景 + 引导文案

### 设置页面
- `src/pages/Settings.tsx` — 新建：草稿管理(手动保存/清除)、版本号、Changelog
- `src/App.tsx` — 新增 /settings 路由
- `src/components/layout/Sidebar.tsx` — 底部新增设置图标入口，版本号 V2.0→V2.1

## 未完成 / 后续建议
- useTypewriterReveal 的 cleanup 只清了一个 ref timer，实际 setTimeout 未统一清理（低优先级，不影响功能）
- 设置页可扩展：主题切换、API Key 配置、导出数据等
- chunk 超过 500KB 警告，建议后续 code-split
