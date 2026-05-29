import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: [
    'https://creator.xiaohongshu.com/*',
    'https://www.xiaohongshu.com/*',
  ],
  run_at: 'document_idle',
};

const PLATFORM = 'xiaohongshu';
const NAME = '小红书';
const FILL_TIMEOUT = 20000;
const TAG_INPUT_TIMEOUT = 8000;

const LOGIN_INDICATORS = [
  '.sidebar-user-info',
  '[class*="avatar"]',
  '[class*="user-info"]',
  '[class*="nickname"]',
  '[class*="creator-sidebar"]',
  '[data-testid="user-avatar"]',
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

    const isCreator = /creator\.xiaohongshu\.com/.test(location.hostname);
    const fillResult = isCreator
      ? await tryFillCreator(title, plainText, tags)
      : await tryFillMainSite(title, plainText, tags);

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
   Creator Center (creator.xiaohongshu.com)
   — React 表单：input + textarea + 话题输入
   ═══════════════════════════════════════════ */

async function tryFillCreator(
  title: string,
  body: string,
  tags: string[],
): Promise<{ success: boolean; error?: string }> {
  if (!/\/publish\//.test(location.pathname)) {
    const link = document.querySelector<HTMLAnchorElement>('a[href*="/publish/imgNote"]');
    if (link) { link.click(); await sleep(2000); }
    else { window.location.href = 'https://creator.xiaohongshu.com/publish/imgNote'; await sleep(3000); }
  }

  const titleEl = await waitForElement(findCreatorTitle, FILL_TIMEOUT);
  if (!titleEl) return { success: false, error: '未找到小红书标题输入框' };

  const titleOk = await fillNativeInput(titleEl, title.substring(0, 20));
  if (!titleOk) return { success: false, error: '小红书标题填充失败' };
  showContentBridgeToast('✅ 标题已填充', 'success');

  const bodyEl = await waitForElement(findCreatorBody, FILL_TIMEOUT);
  if (!bodyEl) return { success: false, error: '未找到小红书正文输入框' };

  const bodyOk = await fillNativeInput(bodyEl, body.substring(0, 1000));
  if (!bodyOk) return { success: false, error: '小红书正文填充失败' };
  showContentBridgeToast('✅ 正文已填充', 'success');

  if (tags.length > 0) {
    await fillCreatorTags(tags);
  }

  return { success: true };
}

function findCreatorTitle(): HTMLInputElement | null {
  const selectors = [
    'input[placeholder*="标题"]',
    'input[placeholder*="填写标题"]',
    '#title',
    'input[maxlength="20"]',
    '.title-input',
    'input[class*="title"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLInputElement>(sel);
    if (el && isVisible(el)) return el;
  }
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(
    'input[type="text"], input:not([type])',
  )).filter(isVisible).filter((el) => {
    const ph = (el.placeholder || '') + (el.getAttribute('aria-label') || '');
    return /标题|title/i.test(ph);
  });
  return inputs[0] || null;
}

function findCreatorBody(): HTMLTextAreaElement | null {
  const selectors = [
    'textarea[placeholder*="笔记"]',
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="填写笔记"]',
    'textarea[placeholder*="请输入"]',
    '#content',
    '.content-editor',
    'textarea[class*="content"]',
    'textarea',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLTextAreaElement>(sel);
    if (el && isVisible(el)) return el;
  }
  return null;
}

async function fillCreatorTags(tags: string[]): Promise<void> {
  const cleanTags = tags.map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 10);
  if (cleanTags.length === 0) return;

  const topicTrigger = await waitForElement(findTopicTrigger, FILL_TIMEOUT);
  if (!topicTrigger) {
    showContentBridgeToast('⚠️ 未找到话题入口，请手动添加话题', 'error');
    return;
  }

  clickElement(topicTrigger);
  await sleep(1000);

  for (const tag of cleanTags) {
    const tagInput = await waitForElement(findTopicSearchInput, TAG_INPUT_TIMEOUT);
    if (!tagInput) {
      showContentBridgeToast(`⚠️ 话题"${tag}"输入失败，请手动添加`, 'error');
      break;
    }

    tagInput.focus();
    await fillNativeInput(tagInput, tag);
    await sleep(1000);

    const suggestion = await waitForElement(findTopicSuggestion, TAG_INPUT_TIMEOUT);
    if (suggestion) {
      clickElement(suggestion);
      await sleep(600);
    } else {
      tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      tagInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
      await sleep(600);
    }
  }
}

function findTopicTrigger(): HTMLElement | null {
  const bySelector = Array.from(document.querySelectorAll<HTMLElement>(
    '[class*="topic-wrapper"], [class*="add-topic"], [class*="hash-tag"], [class*="tag-input"]',
  )).filter(isVisible);
  if (bySelector.length > 0) return bySelector[0];

  const byText = Array.from(document.querySelectorAll<HTMLElement>('div, span, button'))
    .filter(isVisible)
    .filter((el) => {
      const t = compactText(el.innerText || '');
      return t === '添加话题' || t === '# 话题' || t === '参与话题' || /^#\s*$/.test(t);
    });
  return byText[0] || null;
}

function findTopicSearchInput(): HTMLInputElement | null {
  const selectors = [
    'input[placeholder*="搜索话题"]',
    'input[placeholder*="话题"]',
    'input[placeholder*="搜索"]',
    '[class*="topic"] input',
    '[class*="tag"] input',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLInputElement>(sel);
    if (el && isVisible(el)) return el;
  }
  return null;
}

function findTopicSuggestion(): HTMLElement | null {
  const selectors = [
    '[class*="topic-suggest"] li',
    '[class*="suggestion"] li',
    '[class*="topic-list"] li',
    '[class*="search-result"] li',
    '[class*="topic"] [class*="item"]',
  ];
  for (const sel of selectors) {
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isVisible);
    if (els.length > 0) return els[0];
  }
  return null;
}

/* ═══════════════════════════════════════════
   Main Site (www.xiaohongshu.com/create)
   — contenteditable div 编辑器
   ═══════════════════════════════════════════ */

async function tryFillMainSite(
  title: string,
  body: string,
  tags: string[],
): Promise<{ success: boolean; error?: string }> {
  if (!/\/create/.test(location.pathname)) {
    window.location.href = 'https://www.xiaohongshu.com/create';
    await sleep(3000);
  }

  const editor = await waitForElement(findMainSiteEditor, FILL_TIMEOUT);
  if (!editor) return { success: false, error: '未找到小红书正文编辑器' };

  const tagText = tags.length > 0
    ? '\n\n' + tags.map((t) => t.startsWith('#') ? t : `#${t}`).join(' ')
    : '';

  const fullContent = title + '\n\n' + body.substring(0, 1000) + tagText;

  editor.focus();
  editor.click();
  await sleep(300);

  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', fullContent);
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    await sleep(800);
    if (editorContains(editor, title.substring(0, 4))) {
      showContentBridgeToast('✅ 内容已粘贴到编辑器', 'success');
      return { success: true };
    }
  } catch { /* fallback */ }

  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, fullContent);
  await sleep(500);
  if (editorContains(editor, title.substring(0, 4))) {
    showContentBridgeToast('✅ 内容已插入到编辑器', 'success');
    return { success: true };
  }

  return { success: false, error: '小红书编辑器内容填充失败' };
}

function findMainSiteEditor(): HTMLElement | null {
  const selectors = [
    'div[contenteditable="true"][class*="editor"]',
    'div[contenteditable="true"][class*="input"]',
    'div[contenteditable="true"][class*="content"]',
    'div[contenteditable="true"]',
  ];
  for (const sel of selectors) {
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isVisible);
    if (els.length > 0) return els[0];
  }
  return null;
}

/* ═══════════════════════════════════════════
   Shared Fill Helpers
   ═══════════════════════════════════════════ */

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

function editorContains(editor: HTMLElement, expected: string): boolean {
  const t = compactText(expected).slice(0, 12);
  return !t || compactText(editor.innerText || editor.textContent || '').includes(t);
}

/* ═══════════════════════════════════════════
   Shared DOM Helpers
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
