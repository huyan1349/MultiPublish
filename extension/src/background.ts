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
    // Open platform editor
    const tab = await chrome.tabs.create({ url, active: false });
    if (!tab.id) throw new Error('Failed to create tab');

    // Wait for page load
    await waitForTabLoad(tab.id);

    // Inject fill script directly via executeScript — bypasses timing issues
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: platform === 'wechat' },
      func: injectContent,
      args: [platform, content],
    });

    await chrome.tabs.update(tab.id, { active: true });

    const success = results?.some((r) => r.result === true);
    if (success) {
      return { platform, platformName, status: 'success',
        message: `已填入${platformName}编辑器，请确认并手动发布`,
        mockUrl: `${url}/post_preview` };
    }

    return { platform, platformName, status: 'failed', message: '未找到编辑器，请确认页面已加载' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    return { platform, platformName, status: 'failed', message: msg };
  }
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { chrome.tabs.onUpdated.removeListener(listener); resolve(); };
    const listener = (tid: number, info: chrome.tabs.TabChangeInfo) => {
      if (tid === tabId && info.status === 'complete') done();
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(done, 20000);
  });
}

// This function is serialized and injected into the target page via executeScript.
// It runs in the page's context — NO access to outer scope variables.
function injectContent(platform: string, content: { title: string; body: string; tags: string[]; summary?: string; coverImage?: string }) {
  const { title, body, tags } = content;
  const isIframe = window.self !== window.top;
  const plainText = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

  function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const desc = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value',
    );
    desc?.set?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // === WECHAT ===
  if (platform === 'wechat') {
    if (isIframe) {
      const ed = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (ed) { ed.innerHTML = body; ed.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    }
    const ti = document.querySelector('#title') as HTMLTextAreaElement;
    if (ti) setNativeValue(ti, title);
    const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement;
    if (iframe?.contentDocument) {
      const ed = iframe.contentDocument.querySelector('[contenteditable="true"]') as HTMLElement;
      if (ed) { ed.innerHTML = body; ed.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    }
    return false;
  }

  // === ZHIHU ===
  if (platform === 'zhihu') {
    const ti = document.querySelector('.WriteIndex-titleInput') as HTMLTextAreaElement
      || document.querySelector('textarea[placeholder*="标题"]') as HTMLTextAreaElement;
    if (ti) setNativeValue(ti, title);

    setTimeout(() => {
      const ed = document.querySelector('.public-DraftEditor-content')
        || document.querySelector('[contenteditable="true"]');
      if (ed) {
        const dt = new DataTransfer();
        dt.setData('text/html', body);
        dt.setData('text/plain', plainText);
        ed.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
      }
    }, 500);
    return true; // fire-and-forget for the setTimeout
  }

  // === BILIBILI ===
  if (platform === 'bilibili') {
    const ti = document.querySelector('input[placeholder*="标题"]') as HTMLInputElement;
    if (ti) setNativeValue(ti, title);
    setTimeout(() => {
      const ed = document.querySelector('.ql-editor') as HTMLElement
        || document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (ed) { ed.innerHTML = body.replace(/\n\n/g, '<p><br></p>').replace(/\n/g, '<br>'); ed.dispatchEvent(new Event('input', { bubbles: true })); }
      const tagInput = document.querySelector('input[placeholder*="标签"]') as HTMLInputElement;
      if (tagInput) setNativeValue(tagInput, tags.join(','));
    }, 800);
    return true;
  }

  // === XIAOHONGSHU ===
  if (platform === 'xiaohongshu') {
    const ti = document.querySelector('input[placeholder*="标题"]') as HTMLInputElement
      || document.querySelector('#title') as HTMLInputElement;
    if (ti) setNativeValue(ti, title);

    const bodyEl = document.querySelector('textarea[placeholder*="笔记"]') as HTMLTextAreaElement
      || document.querySelector('#content') as HTMLTextAreaElement
      || document.querySelector('textarea') as HTMLTextAreaElement;
    if (bodyEl) setNativeValue(bodyEl, plainText);

    const tagInput = document.querySelector('input[placeholder*="话题"]') as HTMLInputElement;
    if (tagInput) setNativeValue(tagInput, tags.join(' '));
    return true;
  }

  return false;
}

export {};
