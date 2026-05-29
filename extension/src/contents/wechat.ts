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
  const isMain = window.self === window.top;

  if (!isMain) {
    // Iframe: fill body only, then signal completion
    await fillBodyInIframe(body);
    await chrome.storage.local.set({ [FILL_FLAG_KEY]: true });
    return;
  }

  // Main frame: fill title → fill body → auto publish
  try {
    if (!await checkLogin()) {
      await chrome.storage.local.remove('contentbridge_fill');
      await report(false, '未检测到公众号登录状态，请先在浏览器中登录 mp.weixin.qq.com 后再发布');
      return;
    }

    const filled = await tryFillMain(title, body, tags || []);
    if (!filled.success) {
      await chrome.storage.local.remove('contentbridge_fill');
      await chrome.storage.local.set({
        contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: filled.error || '填充失败' },
      });
      showContentBridgeToast(`ContentBridge 填充失败：${filled.error}`, 'error');
      return;
    }

    const published = await tryAutoPublish();
    await chrome.storage.local.remove('contentbridge_fill');
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    await chrome.storage.local.set({
      contentbridge_result: {
        platform: PLATFORM,
        platformName: NAME,
        success: published.success,
        message: published.message,
        error: published.success ? undefined : published.message,
      },
    });
    showContentBridgeToast(published.message, published.success ? 'success' : 'error');
  } catch (err) {
    await chrome.storage.local.remove('contentbridge_fill');
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    const msg = err instanceof Error ? err.message : '公众号自动发布失败';
    await chrome.storage.local.set({
      contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: msg },
    });
    showContentBridgeToast(msg, 'error');
  }
})();

async function fillBodyInIframe(body: string) {
  const ed = await waitFor<HTMLElement>('[contenteditable="true"]', FILL_TIMEOUT);
  if (!ed) return;
  ed.innerHTML = body;
  ed.dispatchEvent(new Event('input', { bubbles: true }));
}

async function tryFillMain(title: string, body: string, _tags: string[]): Promise<{ success: boolean; error?: string }> {
  // 1. Fill title
  const titleEl = await waitFor<HTMLTextAreaElement>('#title', FILL_TIMEOUT);
  if (titleEl) setNativeValue(titleEl, title);

  // 2. Try to access the UEditor iframe directly
  const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement | null;
  if (iframe?.contentDocument) {
    const ed = iframe.contentDocument.querySelector<HTMLElement>('[contenteditable="true"]');
    if (ed) {
      ed.innerHTML = body;
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    // Iframe not accessible (cross-origin or not loaded yet) — wait for iframe script to signal
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    const iframeFilled = await waitForStorageFlag(FILL_FLAG_KEY, FILL_TIMEOUT);
    if (!iframeFilled && !titleEl) {
      return { success: false, error: '未找到公众号编辑器' };
    }
  }

  return { success: !!titleEl };
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(1500);

  // Step 1: Find and click the publish button
  const publishBtn = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishBtn) return { success: false, message: '未找到公众号发布按钮' };

  clickElement(publishBtn);
  await sleep(2000);

  // Step 2: Handle confirmation dialogs (up to 3 steps)
  for (let i = 0; i < 3; i++) {
    await sleep(1500);

    if (hasPublishSuccessSignal()) {
      return { success: true, message: '公众号内容已自动提交发布' };
    }

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      clickElement(confirmBtn);
      continue;
    }

    if (hasPublishSuccessSignal()) {
      return { success: true, message: '公众号内容已自动提交发布' };
    }
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: '公众号内容已自动提交发布' }
    : { success: true, message: '已自动点击公众号发布流程，请在页面确认最终状态' };
}

/* ── DOM Finders ── */

function findPublishButton(): HTMLElement | null {
  // WeChat editor publish buttons
  return findButtonByText(['发表', '发布', '群发', '群发消息', '提交发布']);
}

function findConfirmButton(): HTMLElement | null {
  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .weui-desktop-dialog, .weui-desktop-popover, .dialog, .modal, [class*="publish"]',
  )).filter(isVisible);

  for (const root of dialogRoots) {
    const btn = findButtonByText(['确认', '确定', '确认发布', '继续发布', '发表'], root);
    if (btn) return btn;
  }

  return findButtonByText(['确认发布', '确认', '确定', '继续发布', '发表']);
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
  return /发布成功|已发布|发送成功|群发成功|操作成功/.test(text)
    || /\/cgi-bin\/appmsg\?t=media/.test(location.href) === false;
}

/* ── Helpers ── */

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
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
    || /\bdisabled\b|btn_disabled/.test(el.className || '')
  );
}

function compactText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

async function checkLogin(): Promise<boolean> {
  const loginIndicators = [
    '.weui-desktop-header__nav',
    '.header_info',
    '.account_setting_item',
    '[class*="account"]',
    '[class*="header_user"]',
    '.weui-desktop-header',
  ];
  for (const sel of loginIndicators) {
    if (document.querySelector(sel)) return true;
  }
  await sleep(3000);
  for (const sel of loginIndicators) {
    if (document.querySelector(sel)) return true;
  }
  const loginForm = document.querySelector('.login_input, #loginForm, input[placeholder*="账号"]');
  if (loginForm) return false;
  const bodyText = compactText(document.body.innerText || '');
  if (/请重新登录|请登录|登录后使用/.test(bodyText)) return false;
  return true;
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
