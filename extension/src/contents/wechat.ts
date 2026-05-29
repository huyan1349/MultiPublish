import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';
const FILL_TIMEOUT = 15000;
const PUBLISH_TIMEOUT = 30000;
const FILL_FLAG_KEY = 'contentbridge_wechat_filled';

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  const { title, body, tags } = fill.content as { title: string; body: string; tags?: string[] };
  const autoLayout = !!fill.autoLayout;
  const isMain = window.self === window.top;

  if (!isMain) {
    await fillBodyInIframe(body);
    await chrome.storage.local.set({ [FILL_FLAG_KEY]: true });
    return;
  }

  try {
    const filled = await tryFillMain(title, body, tags || []);
    if (!filled.success) {
      await chrome.storage.local.remove('contentbridge_fill');
      await report(false, filled.error || '公众号填充失败');
      return;
    }

    if (!autoLayout) {
      await chrome.storage.local.remove('contentbridge_fill');
      await chrome.storage.local.remove(FILL_FLAG_KEY);
      await report(true, '公众号内容已填充，请手动操作发布');
      return;
    }

    showContentBridgeToast('✅ 内容已填充，开始自动发布流程...', 'success');
    const published = await tryAutoPublish();
    await chrome.storage.local.remove('contentbridge_fill');
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    await report(published.success, published.message);
  } catch (err) {
    await chrome.storage.local.remove('contentbridge_fill');
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    const msg = err instanceof Error ? err.message : '公众号自动发布失败';
    await report(false, msg);
  }
})();

async function report(success: boolean, message: string) {
  await chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success, message, error: success ? undefined : message },
  });
  showContentBridgeToast(message, success ? 'success' : 'error');
}

async function fillBodyInIframe(body: string) {
  const ed = await waitFor<HTMLElement>('[contenteditable="true"]', FILL_TIMEOUT);
  if (!ed) return;
  ed.innerHTML = body;
  ed.dispatchEvent(new Event('input', { bubbles: true }));
  showContentBridgeToast('✅ 正文已填充（iframe）', 'success');
}

async function tryFillMain(title: string, body: string, _tags: string[]): Promise<{ success: boolean; error?: string }> {
  const titleEl = await waitFor<HTMLTextAreaElement>('#title', FILL_TIMEOUT);
  if (titleEl) {
    setNativeValue(titleEl, title);
    showContentBridgeToast('✅ 标题已填充', 'success');
  }

  const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement | null;
  if (iframe?.contentDocument) {
    const ed = iframe.contentDocument.querySelector<HTMLElement>('[contenteditable="true"]');
    if (ed) {
      ed.innerHTML = body;
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      showContentBridgeToast('✅ 正文已填充', 'success');
    }
  } else {
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    const iframeFilled = await waitForStorageFlag(FILL_FLAG_KEY, FILL_TIMEOUT);
    if (!iframeFilled && !titleEl) {
      return { success: false, error: '未找到公众号编辑器' };
    }
  }

  return { success: !!titleEl };
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(2000);

  const publishBtn = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishBtn) return { success: false, message: '未找到公众号发布按钮，请手动点击' };

  if (isDisabled(publishBtn)) {
    return { success: false, message: '公众号发布按钮不可用，请检查内容是否完整' };
  }

  clickElement(publishBtn);
  showContentBridgeToast('✅ 已点击发布按钮', 'success');
  await sleep(2000);

  for (let i = 0; i < 5; i++) {
    await sleep(1500);

    if (hasPublishSuccessSignal()) {
      return { success: true, message: '公众号内容已自动提交发布' };
    }

    const confirmBtn = findConfirmButton();
    if (confirmBtn && !isDisabled(confirmBtn)) {
      clickElement(confirmBtn);
      showContentBridgeToast('✅ 已点击确认按钮', 'success');
      await sleep(2000);
      continue;
    }

    const dialogBtn = findDialogConfirmButton();
    if (dialogBtn) {
      clickElement(dialogBtn);
      showContentBridgeToast('✅ 已点击弹窗确认', 'success');
      await sleep(2000);
      continue;
    }
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: '公众号内容已自动提交发布' }
    : { success: true, message: '已进入公众号发布流程，请在页面确认最终状态' };
}

function findPublishButton(): HTMLElement | null {
  const labels = ['群发', '发表', '发布', '群发消息', '提交发布'];
  const btns = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a.weui-desktop-btn, span.weui-desktop-btn__label'))
    .filter(isVisible)
    .filter((el) => !isDisabled(el));

  const candidates = btns
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((l) => text === l || text.includes(l)));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aScore = labels.indexOf(a.text) >= 0 ? 100 - labels.indexOf(a.text) * 10 : 0;
    const bScore = labels.indexOf(b.text) >= 0 ? 100 - labels.indexOf(b.text) * 10 : 0;
    return bScore - aScore;
  });

  return candidates[0]?.el || null;
}

function findConfirmButton(): HTMLElement | null {
  const labels = ['群发', '确认群发', '确认发布', '确定', '确认', '继续发布', '发表'];
  const btns = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a.weui-desktop-btn, span.weui-desktop-btn__label'))
    .filter(isVisible)
    .filter((el) => !isDisabled(el));

  const candidates = btns
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((l) => text === l || text.includes(l)));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.text.length - b.text.length);
  return candidates[0]?.el || null;
}

function findDialogConfirmButton(): HTMLElement | null {
  const dialogSelectors = [
    '[role="dialog"]', '.weui-desktop-dialog', '.weui-desktop-popover',
    '.weui-desktop-modal', '.dialog', '.modal', '[class*="dialog"]', '[class*="modal"]',
    '[class*="popover"]', '[class*="publish"]',
  ];

  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(dialogSelectors.join(',')))
    .filter(isVisible);

  const labels = ['群发', '确认群发', '确认发布', '确定', '确认', '继续', '发表', '提交'];

  for (const root of dialogRoots) {
    const btns = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], a.weui-desktop-btn, span.weui-desktop-btn__label'))
      .filter(isVisible)
      .filter((el) => !isDisabled(el));

    const candidates = btns
      .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
      .filter(({ text }) => text && labels.some((l) => text === l || text.includes(l)));

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.text.length - b.text.length);
      return candidates[0]?.el || null;
    }
  }

  return null;
}

function hasPublishSuccessSignal(): boolean {
  const text = compactText(document.body.innerText || '');
  if (/发布成功|已发布|发送成功|群发成功|操作成功|提交成功/.test(text)) return true;
  if (/\/cgi-bin\/appmsg\?t=media\/appmsg_edit/.test(location.href)) return false;
  if (!/\/cgi-bin\/appmsg/.test(location.href)) return true;
  return false;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickElement(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
}

function isDisabled(el: HTMLElement): boolean {
  return (
    el.hasAttribute('disabled')
    || el.getAttribute('aria-disabled') === 'true'
    || /\bdisabled\b|btn_disabled|weui-desktop-btn_disabled/.test(el.className || '')
  );
}

function compactText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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

function waitForElement<T extends HTMLElement>(finder: () => T | null, timeout: number): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = finder();
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const el = finder();
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

function waitForStorageFlag(key: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = async () => {
      const data = await chrome.storage.local.get(key);
      if (data[key]) return resolve(true);
      if (Date.now() - start >= timeout) return resolve(false);
      setTimeout(check, 500);
    };
    check();
  });
}
