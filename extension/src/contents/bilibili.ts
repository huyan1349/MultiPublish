import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://member.bilibili.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

const PLATFORM = 'bilibili';
const NAME = 'B站';
const FILL_TIMEOUT = 20000;
const PUBLISH_TIMEOUT = 45000;

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  try {
    const { title, body, tags } = fill.content as { title: string; body: string; tags: string[] };
    console.log('[ContentBridge:Bilibili] 开始填充', { title: title.slice(0, 30), bodyLen: body.length, tags });

    const filled = await tryFill(title, body, tags);
    if (!filled) {
      if (window.top !== window) return;
      dumpPageState();
      await chrome.storage.local.remove('contentbridge_fill');
      await chrome.storage.local.set({
        contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: '未找到B站图文编辑器' },
      });
      showContentBridgeToast('ContentBridge 填充失败：未找到B站图文编辑器', 'error');
      return;
    }

    console.log('[ContentBridge:Bilibili] 填充完成，开始自动发布');
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
    const msg = err instanceof Error ? err.message : 'B站图文自动发布失败';
    await chrome.storage.local.set({
      contentbridge_result: { platform: PLATFORM, platformName: NAME, success: false, message: msg },
    });
    showContentBridgeToast(msg, 'error');
  }
})();

async function tryFill(title: string, body: string, tags: string[]): Promise<boolean> {
  const titleEl = await waitForElement(findTitleEditor, FILL_TIMEOUT);
  if (titleEl) {
    const ok = await fillTextTarget(titleEl, title);
    console.log('[ContentBridge:Bilibili] 标题填充:', ok);
  }

  const ed = await waitForElement(findBodyEditor, FILL_TIMEOUT);
  if (ed) {
    const ok = await fillTextTarget(ed, body);
    console.log('[ContentBridge:Bilibili] 正文填充:', ok);
  } else {
    console.log('[ContentBridge:Bilibili] 未找到正文编辑器');
    dumpPageState();
  }

  await fillTags(tags);
  return !!(titleEl || ed);
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(2000);

  const publishBtn = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishBtn) {
    console.log('[ContentBridge:Bilibili] 未找到发布按钮');
    dumpButtons();
    return { success: false, message: '未找到B站图文发布按钮' };
  }

  console.log('[ContentBridge:Bilibili] 点击发布按钮:', publishBtn.innerText?.slice(0, 30));
  clickElement(publishBtn);
  await sleep(2500);

  for (let i = 0; i < 4; i++) {
    await sleep(1500);

    if (hasPublishSuccessSignal()) {
      return { success: true, message: 'B站图文已自动提交发布' };
    }

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      console.log('[ContentBridge:Bilibili] 点击确认按钮:', confirmBtn.innerText?.slice(0, 30));
      clickElement(confirmBtn);
      continue;
    }

    if (hasPublishSuccessSignal()) {
      return { success: true, message: 'B站图文已自动提交发布' };
    }
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: 'B站图文已自动提交发布' }
    : { success: true, message: '已自动点击B站图文发布流程，请在页面确认最终状态' };
}

/* ── Page diagnostics ── */

function dumpPageState() {
  const allCE = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]'))
    .filter((el) => el.getBoundingClientRect().width > 0);
  console.log('[ContentBridge:Bilibili] contenteditable 元素:', allCE.length);
  allCE.slice(0, 5).forEach((el, i) => {
    console.log(`  [${i}]`, el.tagName, el.className.slice(0, 60), el.getBoundingClientRect());
  });

  const allInputs = Array.from(document.querySelectorAll<HTMLElement>('input, textarea'))
    .filter((el) => el.getBoundingClientRect().width > 0);
  console.log('[ContentBridge:Bilibili] input/textarea 元素:', allInputs.length);
  allInputs.slice(0, 10).forEach((el, i) => {
    const inp = el as HTMLInputElement;
    console.log(`  [${i}]`, el.tagName, el.className?.slice(0, 60), inp.placeholder || '', inp.name || '');
  });
}

function dumpButtons() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
    .filter(isVisible)
    .map((el) => ({ text: compactText(el.innerText || el.textContent || ''), el }))
    .filter(({ text }) => text);
  console.log('[ContentBridge:Bilibili] 可见按钮:', buttons.length);
  buttons.forEach(({ text }) => console.log('  -', text));
}

/* ── DOM Finders ── */

function findPublishButton(): HTMLElement | null {
  return findButtonByText([
    '发布', '立即发布', '提交', '发布文章', '发表', '投稿',
    '确认发布', '提交发布',
  ]);
}

function findConfirmButton(): HTMLElement | null {
  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .modal, .dialog, .popover, [class*="modal"], [class*="dialog"], [class*="popup"], [class*="drawer"]',
  )).filter(isVisible);

  for (const root of dialogRoots) {
    const btn = findButtonByText(['确认', '确定', '确认发布', '提交', '发布', '知道了', '我知道了'], root);
    if (btn) return btn;
  }

  return findButtonByText(['确认发布', '确认', '确定', '提交']);
}

function findTitleEditor(): HTMLElement | null {
  return firstVisible([
    'input[placeholder*="标题"]',
    'textarea[placeholder*="标题"]',
    'input[class*="title"]',
    'textarea[class*="title"]',
    '[contenteditable="true"][data-placeholder*="标题"]',
    '[contenteditable="true"][placeholder*="标题"]',
    '[contenteditable="true"][class*="title"]',
    'input[placeholder*="文章"]',
    'input[name*="title"]',
    'input[id*="title"]',
  ]);
}

function findBodyEditor(): HTMLElement | null {
  // Strategy 1: Known rich-text editor selectors
  const direct = firstVisible([
    '.ql-editor',
    '.ProseMirror',
    '[data-slate-editor="true"]',
    '.rich-text-editor',
    '.editor-content',
    '.editor-body',
    '[class*="rich-text"]',
    '[class*="editor-body"]',
    '[class*="editor-content"]',
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="内容"]',
    'textarea[placeholder*="请输入"]',
    'textarea[placeholder*="创作"]',
    '[contenteditable="true"][data-placeholder*="正文"]',
    '[contenteditable="true"][data-placeholder*="内容"]',
    '[contenteditable="true"][data-placeholder*="创作"]',
    '[contenteditable="true"][role="textbox"]',
  ]);
  if (direct) {
    console.log('[ContentBridge:Bilibili] 正文编辑器(直接匹配):', direct.tagName, direct.className.slice(0, 60));
    return direct;
  }

  // Strategy 2: Largest contenteditable excluding title
  const titleEl = findTitleEditor();
  const editors = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"], textarea'))
    .filter(isVisible)
    .filter((el) => el !== titleEl && !el.contains(titleEl) && !titleEl?.contains(el))
    .map((el) => ({ el, area: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
    .filter(({ area }) => area > 5000)
    .sort((a, b) => b.area - a.area);

  if (editors[0]) {
    console.log('[ContentBridge:Bilibili] 正文编辑器(面积兜底):', editors[0].el.tagName, editors[0].el.className.slice(0, 60), 'area:', editors[0].area);
    return editors[0].el;
  }

  // Strategy 3: Any large input/textarea
  const largeFields = Array.from(document.querySelectorAll<HTMLElement>('input[type="text"], textarea'))
    .filter(isVisible)
    .filter((el) => el !== titleEl)
    .map((el) => ({ el, area: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
    .filter(({ area }) => area > 5000)
    .sort((a, b) => b.area - a.area);

  if (largeFields[0]) {
    console.log('[ContentBridge:Bilibili] 正文编辑器(input兜底):', largeFields[0].el.tagName, 'area:', largeFields[0].area);
    return largeFields[0].el;
  }

  return null;
}

function firstVisible(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const el = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible);
      if (el) return el;
    } catch {
      // Invalid selector, skip
    }
  }
  return null;
}

/* ── Smart fill ── */

async function fillTextTarget(el: HTMLElement, text: string): Promise<boolean> {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  await sleep(200);

  // Input/textarea: use native value setter to bypass React
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text);
    await sleep(100);
    const current = (el as HTMLInputElement).value;
    return current.length > 0 && current === text;
  }

  // contenteditable: capture text BEFORE filling
  const before = compactText(el.innerText || el.textContent || '');

  // Strategy 1: execCommand insertText (works with many rich text editors)
  if (selectAllContent(el) && document.execCommand('insertText', false, text)) {
    console.log('[ContentBridge:Bilibili] 填充策略: execCommand insertText');
    await sleep(300);
    const after = compactText(el.innerText || el.textContent || '');
    if (after !== before && after.length > 10) return true;
  }

  // Strategy 2: ClipboardEvent paste
  if (dispatchTextPaste(el, text)) {
    console.log('[ContentBridge:Bilibili] 填充策略: ClipboardEvent paste');
    await sleep(500);
    const after = compactText(el.innerText || el.textContent || '');
    if (after !== before && after.length > 10) return true;
  }

  // Strategy 3: innerHTML + comprehensive event dispatch (React synthetic events)
  console.log('[ContentBridge:Bilibili] 填充策略: innerHTML 兜底');
  const html = markdownToHtml(text);
  el.innerHTML = html;

  // 触发 React 合成事件需要的全套 event
  el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
  el.blur();
  el.focus();

  await sleep(500);

  // Strategy 4: If still no content, try textContent (plain text bypasses all rendering)
  const afterHtml = compactText(el.innerText || el.textContent || '');
  if (afterHtml === before || afterHtml.length < 10) {
    console.log('[ContentBridge:Bilibili] innerHTML 无效，尝试 textContent');
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    await sleep(300);
    const afterText = compactText(el.innerText || el.textContent || '');
    return afterText !== before && afterText.length > 10;
  }

  return true;
}

function selectAllContent(el: HTMLElement): boolean {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return true;
  } catch {
    return false;
  }
}

async function fillTags(tags: string[]): Promise<void> {
  const cleanTags = tags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean);
  if (cleanTags.length === 0) return;

  const tagInput = document.querySelector<HTMLInputElement>(
    'input[placeholder*="标签"], input[placeholder*="tag"], input[class*="tag"], input[class*="Tag"], input[placeholder*="话题"]',
  );
  if (!tagInput) {
    console.log('[ContentBridge:Bilibili] 未找到标签输入框');
    return;
  }

  console.log('[ContentBridge:Bilibili] 填充标签:', cleanTags);
  tagInput.focus();
  for (const tag of cleanTags) {
    setNativeValue(tagInput, tag);
    tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    tagInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    await sleep(150);
  }
}

function dispatchTextPaste(el: HTMLElement, text: string): boolean {
  try {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    data.setData('text/html', markdownToHtml(text));
    return el.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  } catch {
    return false;
  }
}

/* ── Button helpers ── */

function findButtonByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], a, span, div[class*="btn"], div[class*="button"]'));
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
  return /发布成功|投稿成功|已发布|提交成功|审核中|已提交|发布完成/.test(text);
}

/* ── Utilities ── */

function markdownToHtml(markdown: string): string {
  return markdown
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (/^#{1,6}\s+/.test(chunk)) {
        const level = Math.min(chunk.match(/^#+/)?.[0].length || 2, 3);
        return `<h${level}>${escapeHtml(chunk.replace(/^#{1,6}\s+/, ''))}</h${level}>`;
      }
      if (/^>\s*/.test(chunk)) return `<blockquote>${escapeHtml(chunk.replace(/^>\s*/, ''))}</blockquote>`;
      if (/^-\s+/m.test(chunk)) {
        const items = chunk.split('\n').map((line) => line.replace(/^-\s+/, '').trim()).filter(Boolean);
        return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
      }
      const imageMatch = chunk.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        return `<p><img src="${escapeAttribute(imageMatch[2])}" alt="${escapeAttribute(imageMatch[1])}"></p>`;
      }
      return `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttribute(value = ''): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
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
  el.focus();
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
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || /\bdisabled\b/.test(el.className || '');
}

function compactText(value: string): string {
  return value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
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
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}
