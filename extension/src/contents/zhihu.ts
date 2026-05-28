import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://zhuanlan.zhihu.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'zhihu';
const NAME = '知乎';

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;
  await chrome.storage.local.remove('contentbridge_fill');

  const { title, body } = fill.content as { title: string; body: string };
  const plainText = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  const ok = await tryFill(title, body, plainText);

  await chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: ok, error: ok ? undefined : '未找到知乎编辑器' },
  });
})();

async function tryFill(title: string, body: string, plainText: string): Promise<boolean> {
  const titleEl = await waitFor<HTMLTextAreaElement>('.WriteIndex-titleInput, textarea[placeholder*="标题"]', 8000);
  if (titleEl) {
    const proto = HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(titleEl, title);
    titleEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const ed = await waitFor<HTMLElement>('.public-DraftEditor-content, [contenteditable="true"]', 8000);
  if (!ed) return false;

  const dt = new DataTransfer();
  dt.setData('text/html', body);
  dt.setData('text/plain', plainText);
  ed.focus();
  ed.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
  return true;
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
