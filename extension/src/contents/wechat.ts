import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;
  // Prevent re-triggering on iframe/sub-frame loads
  await chrome.storage.local.remove('contentbridge_fill');

  const { title, body } = fill.content as { title: string; body: string };

  const result = await tryFill(title, body);
  await chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: result.success, error: result.error },
  });
})();

async function tryFill(title: string, body: string): Promise<{ success: boolean; error?: string }> {
  const isIframe = window.self !== window.top;

  // In iframe: directly fill contenteditable
  if (isIframe) {
    const ed = await waitFor<HTMLElement>('[contenteditable="true"]', 8000);
    if (!ed) return { success: false, error: '未找到微信编辑器(iframe)' };
    ed.innerHTML = body;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    return { success: true };
  }

  // In main frame: fill title + try to reach iframe
  const titleEl = await waitFor<HTMLTextAreaElement>('#title', 5000);
  if (titleEl) setNativeValue(titleEl, title);

  const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement;
  if (iframe?.contentDocument) {
    const ed = iframe.contentDocument.querySelector<HTMLElement>('[contenteditable="true"]');
    if (ed) {
      ed.innerHTML = body;
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true };
    }
  }

  // Content script runs in iframe too (all_frames: true), so main frame returns partial
  return { success: !!titleEl, error: titleEl ? undefined : '未找到标题输入框' };
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function waitFor<T extends Element>(selector: string, timeout: number): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<T>(selector);
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}
