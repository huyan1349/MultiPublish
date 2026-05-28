import type { PublishPayload, PublishResult } from './shared/types';

// Listen for publish requests from sidepanel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PUBLISH_TO_PLATFORM') {
    handlePublish(message.payload as PublishPayload)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'failed', message: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_PLATFORM_URLS') {
    sendResponse({
      wechat: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit',
      zhihu: 'https://zhuanlan.zhihu.com/write',
      bilibili: 'https://member.bilibili.com/platform/upload/text/edit',
      xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish',
    });
    return false;
  }
});

async function handlePublish(payload: PublishPayload): Promise<PublishResult> {
  const { platform, platformName, content } = payload;

  try {
    // Open platform editor page
    const urls: Record<string, string> = {
      wechat: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit',
      zhihu: 'https://zhuanlan.zhihu.com/write',
      bilibili: 'https://member.bilibili.com/platform/upload/text/edit',
      xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish',
    };

    const url = urls[platform];
    if (!url) throw new Error(`Unknown platform: ${platform}`);

    // Create tab and wait for it to load
    const tab = await chrome.tabs.create({ url, active: false });

    // Wait for page to load, then inject content script
    await new Promise<void>((resolve) => {
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      // Timeout after 15s
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, 15000);
    });

    // Send content to the content script
    const response = await chrome.tabs.sendMessage(tab.id!, {
      type: 'FILL_EDITOR',
      platform,
      content,
    });

    // Activate the tab so user can see it
    await chrome.tabs.update(tab.id!, { active: true });

    if (response?.success) {
      const mockUrl = `${url.replace(/\/[^/]*$/, '')}/post_preview`;
      return {
        platform,
        platformName,
        status: 'success',
        message: `已填入${platformName}编辑器，请确认并手动发布`,
        mockUrl,
      };
    }

    return {
      platform,
      platformName,
      status: 'failed',
      message: response?.error || '内容注入失败',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    return { platform, platformName, status: 'failed', message: msg };
  }
}

export {};
