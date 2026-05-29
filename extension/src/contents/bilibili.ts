import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://member.bilibili.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'bilibili';
const NAME = 'B站';
const FILL_TIMEOUT = 15000;
const PUBLISH_TIMEOUT = 30000;

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  try {
    const { title, body, tags } = fill.content as { title: string; body: string; tags: string[] };

    const filled = await tryFill(title, body, tags);
    if (!filled) {
      await chrome.storage.local.remove('contentbridge_fill');
      await chrome.storage.local.set({
        contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: '未找到B站编辑器' },
      });
      showContentBridgeToast('ContentBridge 填充失败：未找到B站编辑器', 'error');
      return;
    }

    const published = await tryAutoPublish();
    await chrome.storage.local.remove('contentbridge_fill');
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
    const msg = err instanceof Error ? err.message : 'B站自动发布失败';
    await chrome.storage.local.set({
      contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: msg },
    });
    showContentBridgeToast(msg, 'error');
  }
})();

async function tryFill(title: string, body: string, tags: string[]): Promise<boolean> {
  const titleEl = await waitFor<HTMLInputElement>('input[placeholder*="标题"]', FILL_TIMEOUT);
  if (titleEl) setNativeValue(titleEl, title);

  const ed = await waitFor<HTMLElement>('.ql-editor, [contenteditable="true"]', FILL_TIMEOUT);
  if (ed) {
    ed.innerHTML = body.replace(/\n\n/g, '<p><br></p>').replace(/\n/g, '<br>');
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const tagInput = document.querySelector<HTMLInputElement>('input[placeholder*="标签"]');
  if (tagInput) setNativeValue(tagInput, tags.join(','));

  return !!(titleEl || ed);
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(1500);

  // Step 1: Find and click publish button
  const publishBtn = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishBtn) return { success: false, message: '未找到B站发布按钮' };

  clickElement(publishBtn);
  await sleep(2000);

  // Step 2: Handle confirm dialogs (up to 3 steps)
  for (let i = 0; i < 3; i++) {
    await sleep(1500);

    if (hasPublishSuccessSignal()) {
      return { success: true, message: 'B站专栏已自动提交发布' };
    }

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      clickElement(confirmBtn);
      continue;
    }

    if (hasPublishSuccessSignal()) {
      return { success: true, message: 'B站专栏已自动提交发布' };
    }
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: 'B站专栏已自动提交发布' }
    : { success: true, message: '已自动点击B站发布流程，请在页面确认最终状态' };
}

/* ── DOM Finders ── */

function findPublishButton(): HTMLElement | null {
  return findButtonByText(['发布', '立即发布', '提交', '发布文章', '发表']);
}

function findConfirmButton(): HTMLElement | null {
  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .modal, .dialog, .popover, [class*="modal"], [class*="dialog"]',
  )).filter(isVisible);

  for (const root of dialogRoots) {
    const btn = findButtonByText(['确认', '确定', '确认发布', '提交', '发布'], root);
    if (btn) return btn;
  }

  return findButtonByText(['确认发布', '确认', '确定', '提交']);
}

/* ── Helpers ── */

function findButtonByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], a, span'));
  const candidates = elements
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((label) => text === label || text.includes(label)));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.text.length - a.text.length);
  return candidates[0]?.el || null;
}

function hasPublishSuccessSignal(): boolean {
  const text = compactText(document.body.innerText || '');
  return /发布成功|投稿成功|已发布|提交成功|审核中/.test(text);
}

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
    || /\bdisabled\b/.test(el.className || '')
  );
}

function compactText(value: string): string {
  return value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
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
