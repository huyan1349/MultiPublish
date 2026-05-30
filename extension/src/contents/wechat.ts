import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';
const FILL_TIMEOUT = 20000;
const PUBLISH_TIMEOUT = 30000;

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;
  await chrome.storage.local.remove('contentbridge_fill');

  const { title, body } = fill.content as { title: string; body: string };
  const autoLayout = !!fill.autoLayout;
  const isMain = window.self === window.top;

  if (!isMain) {
    const ok = await fillBodyInIframe(body);
    if (ok) {
      await chrome.storage.local.set({ contentbridge_wechat_body_filled: true });
    }
    return;
  }

  try {
    const titleEl = await waitFor<HTMLElement>('#title', FILL_TIMEOUT);
    if (!titleEl) return fail('未找到标题输入框，请确认已在公众号图文编辑页面');

    const titleOk = fillAndVerifyTitle(titleEl as HTMLTextAreaElement, title, 8000);
    if (!titleOk) return fail('标题填充失败');

    const bodyOk = await tryFillBody(body);
    if (!bodyOk) return fail('正文填充失败，未检测到内容');

    showContentBridgeToast('✅ 标题和正文已填入', 'success');

    if (!autoLayout) {
      return done('公众号内容已填充，请手动操作发布');
    }

    await sleep(2000);
    const published = await tryAutoPublish();
    return published.success ? done(published.message) : fail(published.message);
  } catch (err) {
    fail(err instanceof Error ? err.message : '公众号发布失败');
  }
})();

async function fillBodyInIframe(html: string): Promise<boolean> {
  const ed = await waitFor<HTMLElement>('[contenteditable="true"]', FILL_TIMEOUT);
  if (!ed) return false;

  ed.focus();
  await sleep(200);

  if (pasteHtml(ed, html)) {
    await sleep(500);
    if (hasContent(ed)) return true;
  }

  ed.innerHTML = html;
  ed.dispatchEvent(new Event('input', { bubbles: true }));
  ed.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
  return hasContent(ed);
}

async function tryFillBody(html: string): Promise<boolean> {
  const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement | null;
  if (iframe?.contentDocument) {
    const ed = iframe.contentDocument.querySelector<HTMLElement>('[contenteditable="true"]');
    if (ed) {
      ed.focus();
      if (pasteHtml(ed, html)) {
        await sleep(500);
        if (hasContent(ed)) return true;
      }
      ed.innerHTML = html;
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      ed.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(500);
      if (hasContent(ed)) return true;
    }
  }

  await chrome.storage.local.remove('contentbridge_wechat_body_filled');
  const iframeFilled = await waitForStorageFlag('contentbridge_wechat_body_filled', FILL_TIMEOUT);
  await chrome.storage.local.remove('contentbridge_wechat_body_filled');
  return !!iframeFilled;
}

function fillAndVerifyTitle(el: HTMLTextAreaElement, text: string, timeout: number): boolean {
  const deadline = Date.now() + timeout;
  let ok = tryFillTitle(el, text);
  while (!ok && Date.now() < deadline) {
    ok = tryFillTitle(el, text);
  }
  return ok;
}

function tryFillTitle(el: HTMLTextAreaElement, text: string): boolean {
  el.focus();
  setNativeValue(el, text);
  return (el.value || '').trim().length > 0;
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  const publishBtn = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishBtn) return { success: false, message: '未找到发布按钮，请手动点击发布' };

  clickEl(publishBtn);
  await sleep(2000);

  for (let i = 0; i < 5; i++) {
    if (hasPublishSuccessSignal()) {
      return { success: true, message: '公众号内容已自动提交发布' };
    }

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      clickEl(confirmBtn);
      await sleep(2000);
      continue;
    }

    await sleep(1500);
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: '公众号内容已自动提交发布' }
    : { success: true, message: '已点击发布按钮，请在页面确认最终状态' };
}

function pasteHtml(el: HTMLElement, html: string): boolean {
  try {
    el.focus();
    el.click();
    const dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', htmlToText(html));
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    return true;
  } catch {
    return false;
  }
}

function hasContent(el: HTMLElement): boolean {
  return (el.textContent || '').trim().length > 10;
}

function findPublishButton(): HTMLElement | null {
  return findButtonByText(['发表', '群发', '提交发布', '发布']);
}

function findConfirmButton(): HTMLElement | null {
  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .weui-desktop-dialog, .weui-desktop-popover, [class*="dialog"], [class*="modal"], [class*="publish"], [class*="confirm"]',
  )).filter(isVisible);

  for (const root of dialogRoots) {
    const btn = findButtonByText(['确认', '确定', '确认发布', '继续发布', '发表', '群发'], root);
    if (btn) return btn;
  }

  return findButtonByText(['确认发布', '确认', '确定', '继续发布']);
}

function findButtonByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], a, span'));
  const candidates = elements
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((label) => text === label || text.includes(label)));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const aExact = labels.some((l) => a.text === l) ? 10 : 0;
    const bExact = labels.some((l) => b.text === l) ? 10 : 0;
    return bExact - aExact || b.text.length - a.text.length;
  });
  return candidates[0]?.el || null;
}

function hasPublishSuccessSignal(): boolean {
  const text = compactText(document.body.innerText || '');
  if (/发布成功|已发布|发送成功|群发成功|操作成功|提交成功/.test(text)) return true;
  return false;
}

function done(msg: string) {
  chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: true, message: msg },
  });
  showContentBridgeToast(`✅ ${msg}`, 'success');
}

function fail(msg: string) {
  chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: msg, error: msg },
  });
  showContentBridgeToast(`❌ ${msg}`, 'error');
}

function setNativeValue(el: HTMLTextAreaElement, value: string) {
  const proto = HTMLTextAreaElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, '');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}

function clickEl(el: HTMLElement) {
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
  return el.hasAttribute('disabled')
    || el.getAttribute('aria-disabled') === 'true'
    || /\bdisabled\b|btn_disabled/.test(el.className || '');
}

function compactText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
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
