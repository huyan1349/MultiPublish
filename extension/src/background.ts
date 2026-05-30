import type { PlatformType, PublishPayload, PublishResult } from './shared/types';

const PLATFORM_URLS: Record<string, string> = {
  wechat: 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77',
  zhihu: 'https://zhuanlan.zhihu.com/write',
  bilibili: 'https://member.bilibili.com/platform/upload/text/edit',
  xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish',
};

const PLATFORM_DOMAINS: Record<string, string> = {
  wechat: 'mp.weixin.qq.com',
  zhihu: 'zhuanlan.zhihu.com',
  bilibili: 'member.bilibili.com',
  xiaohongshu: 'creator.xiaohongshu.com',
};

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

function handleMessage(message: { type: string; payload?: unknown }, sendResponse: (response: unknown) => void): boolean {
  if (message.type === 'HEALTH_CHECK') {
    sendResponse({ status: 'ok', version: chrome.runtime.getManifest().version });
    return false;
  }
  if (message.type === 'PUBLISH_TO_PLATFORM') {
    handlePublish(message.payload as PublishPayload)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'failed', message: err.message }));
    return true;
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  return handleMessage(message, sendResponse);
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  return handleMessage(message, sendResponse);
});

async function handlePublish(payload: PublishPayload): Promise<PublishResult> {
  const { platform, platformName, content } = payload;
  const url = PLATFORM_URLS[platform];
  if (!url) throw new Error(`Unknown platform: ${platform}`);

  try {
    await chrome.storage.local.set({
      contentbridge_fill: { platform, content, autoLayout: payload.autoLayout, timestamp: Date.now() },
    });

    const domain = PLATFORM_DOMAINS[platform];
    const existing = await findExistingPlatformTab(domain);

    if (existing) {
      if (platform === 'wechat') {
        await chrome.tabs.update(existing.id!, { active: true });
        await chrome.tabs.reload(existing.id!);
      } else {
        await chrome.tabs.update(existing.id!, { url, active: true });
      }
    } else {
      await chrome.tabs.create({ url, active: true });
    }

    const result = await waitForFillResult(platform, platformName);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    return { platform, platformName, status: 'failed', message: msg };
  }
}

async function findExistingPlatformTab(domain: string): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: `https://${domain}/*` });
  if (tabs.length > 0) return tabs[0];
  return null;
}

function waitForFillResult(platform: PlatformType, platformName: string): Promise<PublishResult> {
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
