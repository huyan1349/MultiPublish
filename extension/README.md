# ContentBridge Chrome Extension

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `build/chrome-mv3-prod/` 目录

## 开发

```bash
pnpm install
pnpm dev          # 开发模式，自动热更新
pnpm build        # 生产构建
```

## 使用

1. 点击 Chrome 工具栏的 ContentBridge 图标打开侧边栏
2. 在编辑器中输入内容（或点 Demo 填充示例）
3. 选择目标平台，点击「生成」
4. 预览各平台适配效果
5. 点击「发布」— 自动打开平台编辑器并填入内容
6. 在平台编辑器确认无误后手动发布

## 支持的平台

- 微信公众号 (mp.weixin.qq.com)
- 知乎专栏 (zhuanlan.zhihu.com)
- B站专栏 (member.bilibili.com)
- 小红书 (creator.xiaohongshu.com)
