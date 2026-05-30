import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlascoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  const { title } = fill.content as { title: string; body: string; tags?: string[] };

  await chrome.storage.local.remove('contentbridge_fill');

  showContentBridgeToast(`📋 标题「${title.substring(0, 20)}${title.length > 20 ? '…' : ''}」已复制到剪贴板，请按 Ctrl+V / ⌘V 粘贴到编辑器`, 'success');

  await chrome.storage.local.set({
    contentbridge_result: {
      platform: PLATFORM,
      platformName: NAME,
      success: true,
      message: '内容已复制到剪贴板，请在公众号编辑器中粘贴',
    },
  });
})();
