import type { PublishPayload, PublishResult } from './shared/types';

const PLATFORM_URLS: Record<string, string> = {
  wechat: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit',
  zhihu: 'https://zhuanlan.zhihu.com/write',
  bilibili: 'https://member.bilibili.com/platform/upload/text/edit',
  xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish',
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PUBLISH_TO_PLATFORM') {
    handlePublish(message.payload as PublishPayload)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'failed', message: err.message }));
    return true;
  }
});

async function handlePublish(payload: PublishPayload): Promise<PublishResult> {
  const { platform, platformName, content } = payload;
  const url = PLATFORM_URLS[platform];
  if (!url) throw new Error(`Unknown platform: ${platform}`);

  try {
    // Write fill data to storage before opening tab
    await chrome.storage.local.set({
      contentbridge_fill: { platform, content, timestamp: Date.now() },
    });

    // Open platform editor
    const tab = await chrome.tabs.create({ url, active: false });
    if (!tab.id) throw new Error('Failed to create tab');

    // Wait for fill result from content script (via storage polling)
    const result = await waitForFillResult(tab.id, platform, platformName);

    await chrome.tabs.update(tab.id, { active: true });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    return { platform, platformName, status: 'failed', message: msg };
  }
}

function waitForFillResult(tabId: number, platform: string, platformName: string): Promise<PublishResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.storage.onChanged.removeListener(listener);
      resolve({ platform, platformName, status: 'failed', message: '填充超时，请手动粘贴' });
    }, 30000);

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return;
      if (!changes.contentbridge_result) return;
      const result = changes.contentbridge_result.newValue;
      if (!result || result.platform !== platform) return;
      clearTimeout(timeout);
      chrome.storage.onChanged.removeListener(listener);
      chrome.storage.local.remove('contentbridge_result');
      resolve({
        platform: result.platform,
        platformName: result.platformName || platformName,
        status: result.success ? 'success' : 'failed',
        message: result.success ? `已填入${platformName}编辑器，请确认并手动发布` : (result.error || '填充失败'),
        mockUrl: result.success ? `${PLATFORM_URLS[platform]}/post_preview` : undefined,
      });
    };

    chrome.storage.onChanged.addListener(listener);
  });
}

export {};
