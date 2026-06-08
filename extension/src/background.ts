import type { ImagePayload, PlatformType, PublishPayload, PublishResult } from './shared/types';

const PLATFORM_URLS: Record<string, string> = {
  wechat: 'https://mp.weixin.qq.com/',
  zhihu: 'https://zhuanlan.zhihu.com/write',
  bilibili: 'https://member.bilibili.com/platform/upload/text/edit',
  xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish',
  weibo: 'https://weibo.com/',
};

const PLATFORM_DOMAINS: Record<string, string> = {
  wechat: 'mp.weixin.qq.com',
  zhihu: 'zhuanlan.zhihu.com',
  bilibili: 'member.bilibili.com',
  xiaohongshu: 'creator.xiaohongshu.com',
  weibo: 'weibo.com',
};

const PLATFORM_NAMES: Record<string, string> = {
  wechat: '微信公众号',
  zhihu: '知乎',
  bilibili: 'B站',
  xiaohongshu: '小红书',
  weibo: '微博',
};

const pendingImages = new Map<PlatformType, ImagePayload[]>();
const activePublishTabs = new Map<PlatformType, number>(); // platform → tabId

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
  if (message.type === 'READ_WX_META') {
    readWxMetaFromTab()
      .then((meta) => sendResponse({ meta }))
      .catch(() => sendResponse({ meta: null }));
    return true;
  }
  if (message.type === 'PUBLISH_TO_PLATFORM') {
    const msg = message as { type: string; payload?: PublishPayload; platform?: PlatformType; platformName?: string; content?: unknown; autoLayout?: boolean; images?: ImagePayload[] };
    const p: PublishPayload = msg.payload
      ? msg.payload
      : { platform: msg.platform!, platformName: msg.platformName || PLATFORM_NAMES[msg.platform!] || msg.platform!, content: msg.content as PublishPayload['content'], autoLayout: msg.autoLayout, images: msg.images };
    handlePublish(p)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'failed', message: err.message }));
    return true;
  }
  if (message.type === 'GET_IMAGES') {
    const { platform } = message.payload as { platform: PlatformType };
    const images = pendingImages.get(platform) || [];
    sendResponse({ images });
    return false;
  }
  if (message.type === 'CANCEL_PUBLISH') {
    const { platform } = (message.payload || {}) as { platform?: PlatformType };
    handleCancelPublish(platform)
      .then(() => sendResponse({ status: 'cancelled' }))
      .catch((err) => sendResponse({ status: 'error', message: err.message }));
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
    if (payload.images && payload.images.length > 0) {
      pendingImages.set(platform, payload.images);
    }

    const cleanContent = { ...content };
    if (cleanContent.coverImage && cleanContent.coverImage.startsWith('data:')) {
      delete cleanContent.coverImage;
    }
    cleanContent.body = stripDataUrlFromBody(cleanContent.body);

    await chrome.storage.local.set({
      [`contentbridge_fill_${platform}`]: { platform, content: cleanContent, autoLayout: payload.autoLayout, timestamp: Date.now() },
    });

    const domain = PLATFORM_DOMAINS[platform];
    const existing = await findExistingPlatformTab(domain);

    let activeTabId: number | undefined;
    if (existing) {
      activeTabId = existing.id;
      await chrome.tabs.update(activeTabId!, { active: true });
      if (platform === 'wechat') {
        await chrome.scripting.executeScript({
          target: { tabId: activeTabId! },
          func: () => window.location.reload(),
        });
      } else {
        await chrome.tabs.update(activeTabId!, { url, active: true });
      }
    } else {
      const tab = await chrome.tabs.create({ url, active: true });
      activeTabId = tab.id;
    }

    if (activeTabId) {
      activePublishTabs.set(platform, activeTabId);
    }

    const result = await waitForFillResult(platform, platformName);
    activePublishTabs.delete(platform);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    pendingImages.delete(platform);
    activePublishTabs.delete(platform);
    return { platform, platformName, status: 'failed', message: msg };
  }
}

async function handleCancelPublish(platform?: PlatformType): Promise<void> {
  const platformsToCancel = platform
    ? [platform]
    : Array.from(activePublishTabs.keys());

  for (const p of platformsToCancel) {
    // Clear fill data so content scripts stop
    await chrome.storage.local.remove(`contentbridge_fill_${p}`);
    // Clear wechat-specific keys too
    await chrome.storage.local.remove('contentbridge_wechat_editor');
    await chrome.storage.local.remove('contentbridge_wechat_autopublish');

    // Close the active tab for this platform
    const tabId = activePublishTabs.get(p);
    if (tabId) {
      try { await chrome.tabs.remove(tabId); } catch { /* tab may already be closed */ }
      activePublishTabs.delete(p);
    }

    // Clear pending images
    pendingImages.delete(p);

    // Write cancelled result so any waiting promise resolves
    // 用 per-platform key 避免 5 平台并行时结果互相覆盖（C1 修复）
    const platformName = PLATFORM_NAMES[p] || p;
    await chrome.storage.local.set({
      [`contentbridge_result_${p}`]: {
        platform: p,
        platformName,
        success: false,
        message: '发布已取消',
        error: '用户取消',
      },
    });
  }
}

function stripDataUrlFromBody(body: string): string {
  let result = body.replace(/<img[^>]*src\s*=\s*["']data:[^"']*["'][^>]*\/?>/gi, '');
  let searchFrom = 0;
  let safety = 0;
  while (safety < 500) {
    const start = result.indexOf('![', searchFrom);
    if (start === -1) break;
    const bracketEnd = result.indexOf('](', start);
    if (bracketEnd === -1) { searchFrom = start + 2; safety++; continue; }
    const urlStart = bracketEnd + 2;
    const parenEnd = result.indexOf(')', urlStart);
    if (parenEnd === -1) { searchFrom = start + 2; safety++; continue; }
    const url = result.slice(urlStart, parenEnd);
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      result = result.slice(0, start) + result.slice(parenEnd + 1);
      searchFrom = start;
    } else {
      searchFrom = parenEnd + 1;
    }
    safety++;
  }
  return result;
}

async function findExistingPlatformTab(domain: string): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: `https://${domain}/*` });
  if (tabs.length > 0) return tabs[0];
  return null;
}

async function readWxMetaFromTab(): Promise<{
  uid: string;
  nickName: string;
  token: string;
  ticket: string;
  svrTime: string;
} | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const tabs = await chrome.tabs.query({ url: 'https://mp.weixin.qq.com/*' });
    if (tabs.length === 0) {
      await sleep(2000);
      continue;
    }

    const tab = tabs[0];
    const tabId = tab.id;
    if (!tabId) { await sleep(2000); continue; }

    if (tab.status === 'loading') {
      await sleep(2000);
      continue;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          try {
            const wx = (window as any).wx;
            if (wx && wx.commonData && wx.commonData.data && wx.commonData.data.t) {
              const d = wx.commonData.data;
              return {
                uid: d.user_name || '',
                nickName: d.nick_name || '',
                token: d.t,
                ticket: d.ticket || '',
                svrTime: d.time || '',
              };
            }
          } catch {}
          return null;
        },
      });

      const meta = results?.[0]?.result ?? null;
      if (meta) return meta;
    } catch {}

    await sleep(3000);
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForFillResult(platform: PlatformType, platformName: string): Promise<PublishResult> {
  const resultKey = `contentbridge_result_${platform}`;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.storage.onChanged.removeListener(listener);
      pendingImages.delete(platform);
      resolve({ platform, platformName, status: 'failed', message: `${platformName}自动发布超时，请检查是否已登录或页面结构是否变化` });
    }, 90000);

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return;
      // 用 per-platform key 避免 5 平台并行时结果互相覆盖（C1 修复）
      const change = changes[resultKey];
      if (!change) return;
      const result = change.newValue;
      if (!result) return;
      clearTimeout(timeout);
      chrome.storage.onChanged.removeListener(listener);
      chrome.storage.local.remove(resultKey);
      pendingImages.delete(platform);
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
