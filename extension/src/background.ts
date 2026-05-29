import type { PlatformType, PublishPayload, PublishResult } from './shared/types';

const PLATFORM_URLS: Record<string, string> = {
  wechat: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77',
  zhihu: 'https://zhuanlan.zhihu.com/write',
  bilibili: 'https://member.bilibili.com/platform/upload/video/frame',
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

    // Wait for fill/publish result from content script (via storage polling)
    const result = await waitForFillResult(tab.id, platform, platformName);

    await chrome.tabs.update(tab.id, { active: true });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    return { platform, platformName, status: 'failed', message: msg };
  }
}

function waitForFillResult(tabId: number, platform: PlatformType, platformName: string): Promise<PublishResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.storage.onChanged.removeListener(listener);
      resolve({ platform, platformName, status: 'failed', message: `${platformName}自动发布超时，请检查是否已登录或页面结构是否变化` });
    }, 90000);

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
        message: result.message || (result.success ? `已自动提交${platformName}发布流程` : (result.error || '发布失败')),
        mockUrl: result.success ? PLATFORM_URLS[platform] : undefined,
      });
    };

    chrome.storage.onChanged.addListener(listener);
  });
}

export {};
