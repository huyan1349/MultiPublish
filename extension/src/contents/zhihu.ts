import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://zhuanlan.zhihu.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'zhihu';
const NAME = '知乎';
const FILL_TIMEOUT = 15000;
const PUBLISH_TIMEOUT = 25000;

(async function init() {
  try {
    const data = await chrome.storage.local.get('contentbridge_fill');
    const fill = data.contentbridge_fill;
    if (!fill || fill.platform !== PLATFORM) return;
    await chrome.storage.local.remove('contentbridge_fill');

    const { title, body } = fill.content as { title: string; body: string };
    const plainText = htmlToPlainText(body);
    const filled = await tryFill(title, body, plainText);

    if (!filled.success) {
      await report(false, filled.error || '知乎填充失败');
      return;
    }

    const published = await tryAutoPublish();
    await report(published.success, published.message);
  } catch (err) {
    await report(false, err instanceof Error ? err.message : '知乎自动发布失败');
  }
})();

async function report(success: boolean, message: string) {
  await chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success, message, error: success ? undefined : message },
  });
  showContentBridgeToast(message, success ? 'success' : 'error');
}

async function tryFill(titleStr: string, bodyHtml: string, plainText: string): Promise<{ success: boolean; error?: string }> {
  const titleEl = await waitForElement(findTitleField, FILL_TIMEOUT);
  if (!titleEl) return { success: false, error: '未找到知乎标题输入框' };

  fillTextField(titleEl, titleStr);
  for (let i = 0; i < 5; i++) {
    await sleep(600);
    if (getFieldText(titleEl).includes(titleStr.substring(0, 4))) break;
    fillTextField(titleEl, titleStr);
  }

  const editor = await waitForElement(findBodyEditor, FILL_TIMEOUT);
  if (!editor) return { success: false, error: '未找到知乎正文编辑器' };

  await fillRichEditor(editor, bodyHtml, plainText);

  // Smart dialog dismissal: stop when no dialog seen for 2 consecutive rounds (no false clicks)
  let noDialogStreak = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(600);
    if (await dismissAnyDialog()) {
      noDialogStreak = 0;
    } else {
      noDialogStreak++;
      if (noDialogStreak >= 2) break;
    }
  }

  // Re-fill body if it was cleared by dialog actions
  if (!editorContains(editor, plainText)) {
    await fillRichEditor(editor, bodyHtml, plainText);
    await sleep(800);
  }

  const bodyOk = await waitUntil(() => editorContains(editor, plainText), 5000);
  const titleOk = getFieldText(titleEl).length > 0;

  return bodyOk && titleOk
    ? { success: true }
    : { success: false, error: titleOk ? '正文填充后未检测到内容' : '标题填充后未能持久化' };
}

async function fillRichEditor(editor: HTMLElement, html: string, plainText: string) {
  editor.focus();
  editor.click();

  try {
    const dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', plainText);
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    await sleep(800);
    if (editorContains(editor, plainText)) return;
  } catch { /* older Chromium */ }

  selectElementContents(editor);
  document.execCommand('insertHTML', false, html);
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: plainText }));
  await sleep(500);
  if (editorContains(editor, plainText)) return;

  editor.innerHTML = html;
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ─────────────────────────────────────
   Dialog dismissal — returns true if
   something was dismissed
   ───────────────────────────────────── */

async function dismissAnyDialog(): Promise<boolean> {
  // STEP 1: Find any visible dialog/popover that mentions Markdown/format/parse
  const dialogSelectors = [
    '[role="dialog"]', '[role="alertdialog"]', '.Modal', '.Dialog',
    '.Popover', '.Tooltip', '[class*="modal"]', '[class*="dialog"]',
    '[class*="popup"]', '[class*="toast"]', '[class*="notification"]',
  ];

  const allDialogs = Array.from(
    document.querySelectorAll<HTMLElement>(dialogSelectors.join(','))
  ).filter(isVisible);

  for (const dialog of allDialogs) {
    const text = compactText(dialog.innerText || dialog.textContent || '');

    // Match dialog content
    if (!/解析|Markdown|格式|特殊格式|满意|检查格式/.test(text)) continue;

    // Find all visible buttons in this dialog
    const btns = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, [role="button"]')
    ).filter(isVisible);

    if (btns.length === 0) continue;

    // Prefer "确认" / "确定" / "知道了" — last button typically
    const confirmBtn = btns.findLast((b) => {
      const t = compactText(b.innerText || b.textContent || '');
      return /确认|确定|知道了|解析/.test(t);
    });
    clickElement(confirmBtn || btns[btns.length - 1]);
    await sleep(400);
    return true;
  }

  // STEP 2: Fallback — specific button texts only INSIDE dialogs
  const specificLabels = [
    '确认并解析', '解析 Markdown', '解析并保留', '确认解析',
    '保留 Markdown', '转为Markdown', '转为 Markdown', '确认转换',
    '转为Markdown格式',
  ];
  const specificBtn = findButtonByText(specificLabels);
  if (specificBtn) { clickElement(specificBtn); await sleep(400); return true; }

  return false;
}

// Dialog watcher with debounce to avoid interference during dismissal
function startDialogWatcher() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (timer) return; // debounce: only fire once per batch of mutations
    timer = setTimeout(() => {
      timer = null;
      dismissAnyDialog();
    }, 800);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return {
    disconnect() {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    },
  };
}

/* ─────────────────────────────────────
   Auto-publish flow
   ───────────────────────────────────── */

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  const watcher = startDialogWatcher();
  await sleep(1200);

  const publishButton = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishButton) { watcher.disconnect(); return { success: false, message: '未找到知乎发布按钮' }; }
  if (isDisabled(publishButton)) { watcher.disconnect(); return { success: false, message: '知乎发布按钮不可用，请检查标题、正文或账号状态' }; }

  clickElement(publishButton);

  for (let i = 0; i < 5; i++) {
    await sleep(1200);

    await dismissAnyDialog();

    const validation = findValidationText();
    if (validation) { watcher.disconnect(); return { success: false, message: validation }; }

    const confirm = findConfirmButton();
    if (confirm && !isDisabled(confirm)) { clickElement(confirm); continue; }

    if (hasPublishSuccessSignal()) { watcher.disconnect(); return { success: true, message: '知乎文章已自动提交发布' }; }
  }

  watcher.disconnect();
  return hasPublishSuccessSignal()
    ? { success: true, message: '知乎文章已自动提交发布' }
    : { success: true, message: '已自动点击知乎发布流程，请在知乎页面确认最终状态' };
}

/* ─────────────────────────────────────
   DOM finders
   ───────────────────────────────────── */

function findTitleField(): HTMLElement | null {
  const selectors = [
    '.WriteIndex-titleInput', '[data-testid*="title"]',
    '[class*="title"][contenteditable="true"]', '[class*="Title"]',
    '[contenteditable="true"][data-placeholder*="标题"]',
    '[contenteditable="true"][aria-label*="标题"]',
    '[contenteditable="true"][placeholder*="标题"]',
    'h1[contenteditable="true"]', 'textarea[placeholder*="标题"]',
    'input[placeholder*="标题"]', 'input[placeholder*="文章"]',
    '[contenteditable="true"][data-placeholder*="输入"]',
    '[contenteditable="true"][aria-label*="title" i]',
  ];
  const exact = findFirstVisible(selectors);
  if (exact) return exact;
  // Fallback: topmost contenteditable
  const editables = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]')).filter(isVisible);
  if (editables.length === 0) return null;
  if (editables.length === 1) return editables[0];
  return editables.reduce((a, b) => a.getBoundingClientRect().top < b.getBoundingClientRect().top ? a : b);
}

function findBodyEditor(): HTMLElement | null {
  const selectors = [
    '.DraftEditor-editorContainer [contenteditable="true"]',
    '.public-DraftEditor-content[contenteditable="true"]',
    '.RichText [contenteditable="true"]',
    '.Editable [contenteditable="true"]',
    '[contenteditable="true"][data-testid*="editor"]',
    '[contenteditable="true"]',
  ];
  for (const sel of selectors) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isVisible).filter((el) => !isTitleLike(el));
    if (candidates.length > 0) return candidates[0];
  }
  return null;
}

function findPublishButton(): HTMLElement | null {
  return findButtonByText(['发布', '发布文章', '立即发布', '发表']);
}

function findConfirmButton(): HTMLElement | null {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .Modal, .Dialog, .Popover, .PublishPanel, .PublishMenu, .PublishModal',
  )).filter(isVisible);
  for (const root of roots) {
    const btn = findButtonByText(['确认发布', '发布文章', '立即发布', '确定发布', '确定', '发布'], root);
    if (btn) return btn;
  }
  return findButtonByText(['确认发布', '发布文章', '立即发布', '确定发布', '确定']);
}

function findButtonByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], a'));
  const candidates = elements
    .filter(isVisible).filter((el) => !isDisabled(el))
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((l) => text === l || text.includes(l)))
    .filter(({ text }) => !/设置|草稿|取消|关闭/.test(text));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => buttonScore(b.text, labels) - buttonScore(a.text, labels));
  return candidates[0]?.el || null;
}

function buttonScore(text: string, labels: string[]): number {
  let score = 0;
  if (labels.includes(text)) score += 10;
  if (/发布/.test(text)) score += 5;
  if (/确认|立即/.test(text)) score += 3;
  return score;
}

function findValidationText(): string | null {
  const text = compactText(document.body.innerText || '');
  const patterns = [/请选择[^，。；\n]{0,20}/, /不能为空/, /至少输入[^，。；\n]{0,20}/, /请先登录/, /登录后/, /发布失败[^，。；\n]{0,30}/, /操作过于频繁[^，。；\n]{0,30}/];
  const match = patterns.map((p) => text.match(p)?.[0]).find(Boolean);
  return match ? `知乎自动发布受阻：${match}` : null;
}

function hasPublishSuccessSignal(): boolean {
  const text = compactText(document.body.innerText || '');
  return /发布成功|已发布|审核中|提交成功/.test(text) || !/\/write/.test(location.pathname);
}

/* ─────────────────────────────────────
   Fill helpers
   ───────────────────────────────────── */

function fillTextField(el: HTMLElement, value: string) {
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    return;
  }
  // contenteditable
  el.innerHTML = value.replace(/\n/g, '<br>');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  el.focus();
  el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
  el.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: value }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: value }));
  selectElementContents(el);
  document.execCommand('insertText', false, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function findFirstVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
    if (el) return el;
  }
  return null;
}

function clickElement(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
}

function selectElementContents(el: HTMLElement) {
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);
  el.focus();
}

/* ─────────────────────────────────────
   Helpers
   ───────────────────────────────────── */

function editorContains(editor: HTMLElement, expected: string): boolean {
  const t = compactText(expected).slice(0, 24);
  return !t || compactText(editor.innerText || editor.textContent || '').includes(t);
}

function isTitleLike(el: HTMLElement): boolean {
  const raw = `${el.className || ''} ${el.getAttribute('placeholder') || ''} ${el.getAttribute('data-placeholder') || ''} ${el.getAttribute('aria-label') || ''}`;
  return /title|标题/i.test(raw);
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
}

function isDisabled(el: HTMLElement): boolean {
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || /\bdisabled\b|Button--disabled/.test(el.className || '');
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return compactText(doc.body.textContent || html.replace(/<[^>]*>/g, ' '));
}

function getFieldText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
  return compactText(el.innerText || el.textContent || '');
}

function compactText(value: string): string {
  return value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

function waitUntil(check: () => boolean, timeout: number): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (check()) return resolve(true);
      if (Date.now() - start >= timeout) return resolve(false);
      setTimeout(tick, 200);
    };
    tick();
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
