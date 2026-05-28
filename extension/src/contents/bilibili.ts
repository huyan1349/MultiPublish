import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://member.bilibili.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'bilibili';
const NAME = 'B站';

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;
  await chrome.storage.local.remove('contentbridge_fill');

  const { title, body, tags } = fill.content as { title: string; body: string; tags: string[] };
  const ok = await tryFill(title, body, tags);

  await chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: ok, error: ok ? undefined : '未找到B站编辑器' },
  });
})();

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function tryFill(title: string, body: string, tags: string[]): Promise<boolean> {
  const titleEl = await waitFor<HTMLInputElement>('input[placeholder*="标题"]', 8000);
  if (titleEl) setNativeValue(titleEl, title);

  const ed = await waitFor<HTMLElement>('.ql-editor, [contenteditable="true"]', 8000);
  if (!ed) return false;

  ed.innerHTML = body.replace(/\n\n/g, '<p><br></p>').replace(/\n/g, '<br>');
  ed.dispatchEvent(new Event('input', { bubbles: true }));

  const tagInput = document.querySelector<HTMLInputElement>('input[placeholder*="标签"]');
  if (tagInput) setNativeValue(tagInput, tags.join(','));
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
