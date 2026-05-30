import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

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

  try {
    // 1. 找标题 — 一定是可编辑元素
    const titleEl = await waitFor(findTitleInput, 15000);
    if (!titleEl) return fail('未找到标题输入框，请确认知乎写文章页面已加载完成');

    // 2. 填标题 — 多策略 + 反复验证，确保落盘
    const titleOk = await fillAndVerify(titleEl, title, 5000);
    if (!titleOk) return fail(`标题填充失败：${describeEl(titleEl)}`);

    // 3. 找正文编辑器
    const bodyEl = await waitFor(findBodyEditor, 15000);
    if (!bodyEl) return fail('未找到正文编辑器');

    // 4. 填正文
    pasteHtml(bodyEl, body);
    await sleep(1000);
    if (!hasContent(bodyEl)) return fail('正文填充后未检测到内容');

    // 5. 找发布按钮，确认可用
    await sleep(1000);
    const publishBtn = await waitFor(findPublishButton, 15000);
    if (!publishBtn) return fail('未找到发布按钮');
    if (isDisabled(publishBtn)) return fail('发布按钮不可用 — 标题或正文为空');

    // 6. 点击发布 → 点确认弹窗 → 立即上报（不等页面跳转，避免脚本被销毁丢结果）
    clickEl(publishBtn);
    await sleep(1500);
    // 处理可能的确认弹窗
    for (let i = 0; i < 3; i++) {
      const confirmBtn = findConfirmButton();
      if (!confirmBtn) break;
      clickEl(confirmBtn);
      await sleep(1500);
    }
    done('知乎文章已自动提交发布');
  } catch (err) {
    fail(err instanceof Error ? err.message : '知乎发布失败');
  }
})();

/* ── 结果上报 ── */

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

/* ── 标题：找真正的可编辑元素 ── */

function findTitleInput(): HTMLElement | null {
  // 直接是可编辑元素
  const direct = findFirstVisible([
    'textarea[placeholder="请输入标题"]',
    'input[placeholder="请输入标题"]',
    '[contenteditable="true"][placeholder="请输入标题"]',
    'textarea[placeholder*="标题"]',
    'input[placeholder*="标题"]',
    '[contenteditable="true"][data-placeholder*="标题"]',
    '.WriteIndex-titleInput',
    'h1[contenteditable="true"]',
  ]);
  if (direct && isEditable(direct)) return direct;

  // 如果 placeholder 在容器上，钻进去找可编辑子元素
  const wrapper = document.querySelector<HTMLElement>(
    '[placeholder="请输入标题"], [data-placeholder="请输入标题"]',
  );
  if (wrapper) {
    const inner = wrapper.querySelector<HTMLElement>(
      'textarea, input, [contenteditable="true"]',
    );
    if (inner && isVisible(inner)) return inner;
  }

  // 兜底：找页面上第一条窄的 contenteditable（标题是单行）
  const all = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"], textarea, input[type="text"]'))
    .filter(isVisible)
    .filter((el) => {
      const h = el.getBoundingClientRect().height;
      return h > 20 && h < 100; // 标题高度 20-100px
    })
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  return all[0] || null;
}

function isEditable(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === 'textarea' || tag === 'input' || el.isContentEditable;
}

function describeEl(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 40);
  const ph = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '';
  return `<${tag}> class="${cls}" placeholder="${ph}"`;
}

/* ── 标题填充 + 持续验证 ── */

async function fillAndVerify(el: HTMLElement, text: string, timeout: number): Promise<boolean> {
  const deadline = Date.now() + timeout;
  let ok = tryAllFillStrategies(el, text);
  await sleep(400);

  while (!ok && Date.now() < deadline) {
    ok = tryAllFillStrategies(el, text);
    await sleep(600);
  }
  return ok;
}

function tryAllFillStrategies(el: HTMLElement, text: string): boolean {
  el.focus();
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const tag = el.tagName.toLowerCase();

  // A: 原生 value setter
  if (tag === 'textarea' || tag === 'input') {
    setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, text);
    if (readText(el).length > 0) return true;
  }

  // B: CompositionEvent（React IME）
  el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
  el.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: text }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  if (readText(el).length > 0) return true;

  // C: ClipboardEvent paste
  try {
    selectAll(el);
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    dt.setData('text/html', text.replace(/\n/g, '<br>'));
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    if (readText(el).length > 0) return true;
  } catch { /* ignore */ }

  // D: execCommand
  selectAll(el);
  document.execCommand('insertText', false, text);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  if (readText(el).length > 0) return true;

  // E: innerHTML 兜底
  if (el.isContentEditable) {
    el.innerHTML = text.replace(/\n/g, '<br>');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return readText(el).length > 0;
}

function readText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return (el.value || '').trim();
  }
  return (el.textContent || '').trim();
}

/* ── 正文 ── */

function findBodyEditor(): HTMLElement | null {
  const sel = findFirstVisible([
    '.DraftEditor-editorContainer [contenteditable="true"]',
    '.public-DraftEditor-content[contenteditable="true"]',
    '[contenteditable="true"][data-testid*="editor"]',
  ]);
  if (sel) return sel;

  // 排除标题后找最大的 contenteditable
  const titleEl = findTitleInput();
  const all = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]'))
    .filter(isVisible)
    .filter((el) => el !== titleEl)
    .sort((a, b) => area(b) - area(a));
  return all[0] || null;
}

function pasteHtml(el: HTMLElement, html: string) {
  el.focus();
  el.click();
  const dt = new DataTransfer();
  dt.setData('text/html', html);
  dt.setData('text/plain', htmlToText(html));
  el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
}

function hasContent(el: HTMLElement): boolean {
  return (el.textContent || '').trim().length > 10;
}

/* ── 发布按钮 + 发布结果等待 ── */

function findPublishButton(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], span, div'))
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .filter((el) => {
      const t = (el.textContent || '').trim();
      return t === '发布' || t === '发布文章' || t === '立即发布' || t === '发表';
    });

  if (candidates.length > 0) {
    candidates.sort((a, b) => (a.textContent || '').trim().length - (b.textContent || '').trim().length);
    return candidates[0];
  }
  return null;
}

function findConfirmButton(): HTMLElement | null {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .Modal, .Dialog, .PublishPanel, .PublishModal',
  )).filter(isVisible);
  for (const root of roots) {
    const btn = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter(isVisible)
      .find((b) => /确认发布|发布文章|立即发布|确定|确认/.test((b.textContent || '').trim()));
    if (btn) return btn;
  }
  return null;
}

/* ── DOM 工具 ── */

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, '');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}

function clickEl(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
}

function selectAll(el: HTMLElement) {
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function findFirstVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    try {
      const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
      if (el) return el;
    } catch { /* bad selector */ }
  }
  return null;
}

function area(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return r.width * r.height;
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
}

function isDisabled(el: HTMLElement): boolean {
  return el.hasAttribute('disabled')
    || el.getAttribute('aria-disabled') === 'true'
    || /\bdisabled\b|Button--disabled/.test(el.className || '');
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitFor<T extends HTMLElement>(finder: () => T | null, timeout: number): Promise<T | null> {
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
