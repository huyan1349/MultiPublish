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
    const tab = await chrome.tabs.create({ url, active: false });
    if (!tab.id) throw new Error('Failed to create tab');

    // Wait for page load
    await waitForTabLoad(tab.id);

    // Wait extra 3s for SPA editors to render
    await sleep(3000);

    // Inject fill script — with built-in DOM polling
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
    return { platform, platformName, status: 'failed', message: '未找到编辑器元素' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败';
    return { platform, platformName, status: 'failed', message: msg };
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { chrome.tabs.onUpdated.removeListener(listener); resolve(); };
    const listener = (tid: number, info: chrome.tabs.TabChangeInfo) => {
      if (tid === tabId && info.status === 'complete') done();
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(done, 25000);
  });
}

// Serialized & injected into target page. Polls for editor elements up to 10s.
function injectContent(platform: string, content: { title: string; body: string; tags: string[]; summary?: string; coverImage?: string }) {
  const { title, body, tags } = content;
  const plainText = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

  function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function waitFor<T extends Element>(selector: string, timeout = 8000): Promise<T | null> {
    return new Promise((resolve) => {
      const el = document.querySelector<T>(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el2 = document.querySelector<T>(selector);
        if (el2) { observer.disconnect(); resolve(el2); }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }

  function fillWeChat() {
    // main frame: fill title
    const ti = document.querySelector('#title') as HTMLTextAreaElement;
    if (ti) setNativeValue(ti, title);
    // try to access the iframe
    const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement;
    if (iframe?.contentDocument) {
      const ed = iframe.contentDocument.querySelector<HTMLElement>('[contenteditable="true"]');
      if (ed) { ed.innerHTML = body; ed.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    }
    // if we're inside the iframe already
    const ed = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (ed) { ed.innerHTML = body; ed.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    return false;
  }

  function fillZhihu() {
    const ti = document.querySelector<HTMLTextAreaElement>('.WriteIndex-titleInput, textarea[placeholder*="标题"]');
    if (ti) setNativeValue(ti, title);
    const ed = document.querySelector<HTMLElement>('.public-DraftEditor-content, [contenteditable="true"]');
    if (!ed) return false;
    const dt = new DataTransfer();
    dt.setData('text/html', body);
    dt.setData('text/plain', plainText);
    ed.focus();
    ed.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    return true;
  }

  function fillBilibili() {
    const ti = document.querySelector<HTMLInputElement>('input[placeholder*="标题"]');
    if (ti) setNativeValue(ti, title);
    const ed = document.querySelector<HTMLElement>('.ql-editor, [contenteditable="true"]');
    if (!ed) return false;
    ed.innerHTML = body.replace(/\n\n/g, '<p><br></p>').replace(/\n/g, '<br>');
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    const tagInput = document.querySelector<HTMLInputElement>('input[placeholder*="标签"]');
    if (tagInput) setNativeValue(tagInput, tags.join(','));
    return true;
  }

  function fillXiaohongshu() {
    const ti = document.querySelector<HTMLInputElement>('input[placeholder*="标题"], #title');
    if (ti) setNativeValue(ti, title);
    const bodyEl = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="笔记"], #content, textarea');
    if (bodyEl) setNativeValue(bodyEl, plainText);
    const tagInput = document.querySelector<HTMLInputElement>('input[placeholder*="话题"]');
    if (tagInput) setNativeValue(tagInput, tags.join(' '));
    return !!(ti || bodyEl);
  }

  // Immediate attempt
  let ok = false;
  switch (platform) {
    case 'wechat': ok = fillWeChat(); break;
    case 'zhihu': ok = fillZhihu(); break;
    case 'bilibili': ok = fillBilibili(); break;
    case 'xiaohongshu': ok = fillXiaohongshu(); break;
  }
  if (ok) return true;

  // Poll for editor elements
  const selectors: Record<string, string> = {
    wechat: '#title, #ueditor_0, [contenteditable="true"]',
    zhihu: '.public-DraftEditor-content, [contenteditable="true"], textarea[placeholder*="标题"]',
    bilibili: '.ql-editor, [contenteditable="true"], input[placeholder*="标题"]',
    xiaohongshu: 'textarea, input[placeholder*="标题"]',
  };

  const selector = selectors[platform];
  if (!selector) return false;

  // Wait up to 10s for DOM, then retry
  return waitFor(selector, 10000).then((el) => {
    if (!el) return false;
    switch (platform) {
      case 'wechat': return fillWeChat();
      case 'zhihu': return fillZhihu();
      case 'bilibili': return fillBilibili();
      case 'xiaohongshu': return fillXiaohongshu();
    }
    return false;
  }) as unknown as boolean;
}

export {};
