import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://creator.xiaohongshu.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'xiaohongshu';
const NAME = '小红书';
const FILL_TIMEOUT = 20000;
const NAV_TIMEOUT = 10000;

const LOGIN_INDICATORS = [
  '.sidebar-user-info',
  '[class*="avatar"]',
  '[class*="user-info"]',
  '[class*="nickname"]',
  '[class*="creator-sidebar"]',
];

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  try {
    if (!await checkLogin()) {
      await report(false, '未检测到小红书登录状态，请先登录后再发布');
      return;
    }

    await chrome.storage.local.remove('contentbridge_fill');

    const { title, body, tags } = fill.content as { title: string; body: string; tags: string[] };
    const plainText = htmlToPlainText(body);

    if (!await navigateToLongArticleEditor()) {
      await report(false, '未能进入小红书长文编辑页面，请检查是否有"写长文"权限');
      return;
    }

    const fillResult = await tryFillLongArticle(title, plainText, tags);
    if (!fillResult.success) {
      await report(false, fillResult.error || '小红书填充失败');
      return;
    }

    showContentBridgeToast('✅ 内容已填充完成，请检查后手动点击发布', 'success');
    await report(true, '小红书内容已填充，请手动确认发布');
  } catch (err) {
    await chrome.storage.local.remove('contentbridge_fill');
    const msg = err instanceof Error ? err.message : '小红书填充失败';
    await report(false, msg);
  }
})();

async function report(success: boolean, message: string) {
  await chrome.storage.local.set({
    contentbridge_result: {
      platform: PLATFORM,
      platformName: NAME,
      success,
      message,
      error: success ? undefined : message,
    },
  });
  showContentBridgeToast(message, success ? 'success' : 'error');
}

async function checkLogin(): Promise<boolean> {
  for (const selector of LOGIN_INDICATORS) {
    if (document.querySelector(selector)) return true;
  }
  await sleep(3000);
  for (const selector of LOGIN_INDICATORS) {
    if (document.querySelector(selector)) return true;
  }
  const loginForm = document.querySelector('input[placeholder*="手机号"], input[placeholder*="验证码"]');
  if (loginForm) return false;
  return true;
}

/* ═══════════════════════════════════════════
   导航流程：发布笔记 → 写长文 → 新的创作
   ═══════════════════════════════════════════ */

async function navigateToLongArticleEditor(): Promise<boolean> {
  if (await isLongArticleEditorReady()) return true;

  if (/\/publish\/(publish|imgNote)/.test(location.pathname)) {
    const clicked = await clickByText('写长文', NAV_TIMEOUT);
    if (clicked) {
      await sleep(2000);
      if (await isLongArticleEditorReady()) return true;
    }
  }

  if (!/\/publish/.test(location.pathname)) {
    const publishBtn = await findElementByText('发布笔记', NAV_TIMEOUT);
    if (publishBtn) {
      clickElement(publishBtn);
      await sleep(2000);
    } else {
      window.location.href = 'https://creator.xiaohongshu.com/publish/publish';
      await sleep(3000);
    }

    const clicked = await clickByText('写长文', NAV_TIMEOUT);
    if (clicked) {
      await sleep(2000);
      if (await isLongArticleEditorReady()) return true;
    }
  }

  return false;
}

async function isLongArticleEditorReady(): Promise<boolean> {
  const titleInput = findTitleInput();
  const bodyEditor = findBodyEditor();
  if (titleInput || bodyEditor) return true;

  const newCreationBtn = await findElementByText('新的创作', 3000);
  if (newCreationBtn) {
    clickElement(newCreationBtn);
    await sleep(2000);
    return !!(findTitleInput() || findBodyEditor());
  }

  return false;
}

/* ═══════════════════════════════════════════
   长文编辑器填充
   ═══════════════════════════════════════════ */

async function tryFillLongArticle(
  title: string,
  body: string,
  tags: string[],
): Promise<{ success: boolean; error?: string }> {
  const titleEl = await waitForElement(findTitleInput, FILL_TIMEOUT);
  if (!titleEl) return { success: false, error: '未找到小红书标题输入框' };

  const titleOk = await fillInput(titleEl, title.substring(0, 20));
  if (!titleOk) return { success: false, error: '小红书标题填充失败' };
  showContentBridgeToast('✅ 标题已填充', 'success');

  const bodyEl = await waitForElement(findBodyEditor, FILL_TIMEOUT);
  if (!bodyEl) return { success: false, error: '未找到小红书正文编辑器' };

  const bodyOk = await fillContentEditable(bodyEl, body.substring(0, 5000));
  if (!bodyOk) return { success: false, error: '小红书正文填充失败' };
  showContentBridgeToast('✅ 正文已填充', 'success');

  if (tags.length > 0) {
    await appendTagsToBody(bodyEl, tags);
  }

  return { success: true };
}

function findTitleInput(): HTMLElement | null {
  const selectors = [
    'textarea.d-text[placeholder="输入标题"]',
    'textarea[placeholder*="标题"]',
    'textarea[placeholder*="输入标题"]',
    'textarea.d-text',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLTextAreaElement>(sel);
    if (el && isVisible(el) && !el.classList.contains('d-textarea-shadow')) return el;
  }
  const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'))
    .filter(isVisible)
    .filter((el) => !el.classList.contains('d-textarea-shadow'))
    .filter((el) => /标题|title/i.test(el.placeholder || ''));
  return textareas[0] || null;
}

function findBodyEditor(): HTMLElement | null {
  const selectors = [
    '.ProseMirror',
    '.tiptap.ProseMirror',
    'div.tiptap',
    'div[contenteditable="true"].ProseMirror',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && isVisible(el)) return el;
  }
  const ceByDataPh = document.querySelectorAll<HTMLElement>(
    'div[contenteditable="true"] [data-placeholder*="输入文字"]',
  );
  for (const el of ceByDataPh) {
    const parent = el.closest<HTMLElement>('[contenteditable="true"]');
    if (parent && isVisible(parent)) return parent;
  }
  const ceFallback = Array.from(document.querySelectorAll<HTMLElement>(
    'div[contenteditable="true"]',
  )).filter(isVisible);
  for (const el of ceFallback) {
    if (!/标题|title/i.test(el.getAttribute('data-placeholder') || '')) return el;
  }
  return null;
}

async function appendTagsToBody(editor: HTMLElement, tags: string[]): Promise<void> {
  const tagText = '\n\n' + tags.map((t) => t.startsWith('#') ? t : `#${t}`).join(' ');
  editor.focus();
  await sleep(200);

  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  document.execCommand('insertText', false, tagText);
  await sleep(300);
  showContentBridgeToast('✅ 话题标签已追加', 'success');
}

/* ═══════════════════════════════════════════
   填充策略
   ═══════════════════════════════════════════ */

async function fillInput(el: HTMLElement, value: string): Promise<boolean> {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return fillNativeInput(el, value);
  }
  if (el.isContentEditable) {
    return fillContentEditable(el, value);
  }
  return false;
}

async function fillNativeInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<boolean> {
  el.focus();
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  await sleep(100);

  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');

  desc?.set?.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  await sleep(400);

  if (el.value === value || el.value.length > 0) return true;

  el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
  el.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: value }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: value }));
  await sleep(400);

  if (el.value.length > 0) return true;

  el.focus();
  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, value);
  await sleep(400);

  return el.value.length > 0;
}

async function fillContentEditable(editor: HTMLElement, value: string): Promise<boolean> {
  editor.focus();
  await sleep(300);

  const isEmpty = !editor.textContent || compactText(editor.textContent).length === 0;
  if (!isEmpty) {
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  document.execCommand('insertText', false, value);
  await sleep(600);
  if (editorContains(editor, value.substring(0, 10))) return true;

  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', value);
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    await sleep(800);
    if (editorContains(editor, value.substring(0, 10))) return true;
  } catch { /* fallback */ }

  const paragraphs = value.split('\n').filter(Boolean);
  for (let i = 0; i < paragraphs.length; i++) {
    document.execCommand('insertText', false, paragraphs[i]);
    if (i < paragraphs.length - 1) {
      document.execCommand('insertParagraph');
    }
    await sleep(100);
  }
  await sleep(400);

  return editorContains(editor, value.substring(0, 10));
}

function editorContains(editor: HTMLElement, expected: string): boolean {
  const t = compactText(expected).slice(0, 12);
  return !t || compactText(editor.innerText || editor.textContent || '').includes(t);
}

/* ═══════════════════════════════════════════
   文本查找与点击
   ═══════════════════════════════════════════ */

async function clickByText(text: string, timeout: number): Promise<boolean> {
  const el = await findElementByText(text, timeout);
  if (el) {
    clickElement(el);
    return true;
  }
  return false;
}

async function findElementByText(text: string, timeout: number): Promise<HTMLElement | null> {
  return waitForElement(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>(
      'div, span, button, a, li, p, h1, h2, h3, h4, h5, h6',
    )).filter(isVisible);

    for (const el of all) {
      const elText = compactText(el.innerText || '');
      if (elText === text) return el;
    }
    for (const el of all) {
      const elText = compactText(el.innerText || '');
      if (elText.includes(text)) return el;
    }
    return null;
  }, timeout);
}

/* ═══════════════════════════════════════════
   DOM Helpers
   ═══════════════════════════════════════════ */

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

function compactText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return compactText(doc.body.textContent || html.replace(/<[^>]*>/g, ' '));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
