# Handoff Go

## 已完成
- Web前端公众号发布从剪贴板方案改为扩展自动发布（PUBLISH_TO_PLATFORM）
- extensionBridge.ts: 删除 publishWechatViaClipboard，所有平台统一走 publishViaExtensionMessage
- Dashboard.tsx: 公众号描述更新为"自动发布，自动填充+自动群发"
- background.ts: 修复 PlatformType 类型错误
- TS编译零错误，前端构建成功，已push到 feature/wechat-auto-publish-v2

## 未完成
- B站、小红书自动发布（P0，参照知乎实现）
- SW保活策略（P1）
- 登录态检测（P1）
- 微信图片上传（P1）
- AST格式转换（P2）
- Sidepanel拆分（P2）
- 草稿自动保存（P2）

## 关键信息
- 当前分支: feature/wechat-auto-publish-v2
- 公众号Content Script (wechat.ts) 已实现全自动DOM注入+自动点击发布
- 知乎Content Script (zhihu.ts) 是最完善的参考实现
- Web前端 extensionBridge.ts 现在所有平台统一走 PUBLISH_TO_PLATFORM 消息
