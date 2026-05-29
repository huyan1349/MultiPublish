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
const PUBLISH_TIMEOUT = 60000;

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

/* ── Fill ── */

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

/* ── Auto Publish: 快照对比法 ── */

interface ButtonSnapshot {
  sig: string;
  el: HTMLElement;
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(2000);

  // 初始快照：记录页面上所有可见按钮
  let prevSnapshot = snapshotButtons();
  console.log('[ContentBridge:Bilibili] 初始快照:', prevSnapshot.length, '个按钮');

  // 第一步：找到并点击初始发布按钮
  const publishBtn = findPublishButton();
  if (!publishBtn) {
    console.log('[ContentBridge:Bilibili] 未找到发布按钮，dump:');
    dumpButtons();
    return { success: false, message: '未找到B站图文发布按钮' };
  }

  console.log('[ContentBridge:Bilibili] 点击初始发布按钮:', btnLabel(publishBtn));
  forceClick(publishBtn);

  // 主循环：快照对比，逐轮发现新按钮
  for (let round = 0; round < 12; round++) {
    await sleep(2000);

    if (hasPublishSuccessSignal()) {
      return { success: true, message: 'B站图文已自动提交发布' };
    }

    const currentSnapshot = snapshotButtons();
    const newButtons = findNewButtons(prevSnapshot, currentSnapshot);

    if (newButtons.length > 0) {
      console.log(
        '[ContentBridge:Bilibili] 第', round + 1, '轮，发现新按钮:',
        newButtons.map((b) => btnLabel(b.el)).join(', '),
      );

      // 优先点确认类按钮
      const confirmBtn = newButtons.find((b) => {
        const label = btnLabel(b.el);
        return ['确认', '确定', '确认发布', '提交', '发布', '知道了', '我知道了', '好的', '是'].some((kw) => label === kw || label.includes(kw));
      });

      if (confirmBtn) {
        console.log('[ContentBridge:Bilibili] 点击确认按钮:', btnLabel(confirmBtn.el));
        forceClick(confirmBtn.el);
        prevSnapshot = currentSnapshot;
        continue;
      }

      // 没有明确的确认按钮，点第一个看起来像提交的
      const submitLike = newButtons.find((b) => {
        const label = btnLabel(b.el);
        return ['发布', '提交', '投稿', '保存', '下一步', '继续'].some((kw) => label === kw || label.includes(kw));
      });

      if (submitLike) {
        console.log('[ContentBridge:Bilibili] 点击提交类按钮:', btnLabel(submitLike.el));
        forceClick(submitLike.el);
        prevSnapshot = currentSnapshot;
        continue;
      }

      // 都不匹配，把新按钮全点一遍
      for (const btn of newButtons) {
        console.log('[ContentBridge:Bilibili] 点击未知新按钮:', btnLabel(btn.el));
        forceClick(btn.el);
        await sleep(800);
        if (hasPublishSuccessSignal()) {
          return { success: true, message: 'B站图文已自动提交发布' };
        }
      }
      prevSnapshot = currentSnapshot;
      continue;
    }

    // 没有新按钮，但可能页面还没反应过来，尝试在弹窗/面板中找
    const panelBtn = findButtonInContainers([
      '确认', '确定', '确认发布', '提交', '发布', '知道了', '投稿', '立即发布',
    ]);
    if (panelBtn) {
      console.log('[ContentBridge:Bilibili] 在面板中找到按钮:', btnLabel(panelBtn));
      forceClick(panelBtn);
      prevSnapshot = snapshotButtons();
      continue;
    }

    // 第6轮 dump 一次辅助调试
    if (round === 5) {
      console.log('[ContentBridge:Bilibili] 第6轮，dump 当前状态:');
      dumpButtons();
    }
  }

  // 最终兜底：扫描所有可能跟发布有关的元素
  console.log('[ContentBridge:Bilibili] 进入最终兜底扫描');
  const allTargets = findAllPublishTargets();
  for (const target of allTargets) {
    if (hasPublishSuccessSignal()) break;
    console.log('[ContentBridge:Bilibili] 兜底点击:', btnLabel(target));
    forceClick(target);
    await sleep(1500);
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: 'B站图文已自动提交发布' }
    : { success: true, message: '已自动点击B站图文发布流程，请在页面确认最终状态' };
}

/* ── Snapshot ── */

function snapshotButtons(): ButtonSnapshot[] {
  return findAllClickables()
    .map((el) => ({ sig: btnSignature(el), el }))
    .filter(({ sig }) => sig.length > 0);
}

function btnSignature(el: HTMLElement): string {
  const text = compactText(el.innerText || el.textContent || '');
  const cls = (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 60);
  const rect = el.getBoundingClientRect();
  const pos = `${Math.round(rect.x)},${Math.round(rect.y)}`;
  return `${text} [${cls}] @${pos}`;
}

function btnLabel(el: HTMLElement): string {
  return compactText(el.innerText || el.textContent || '') || el.tagName;
}

function findNewButtons(before: ButtonSnapshot[], after: ButtonSnapshot[]): ButtonSnapshot[] {
  const beforeSigs = new Set(before.map((b) => b.sig));
  return after.filter((b) => !beforeSigs.has(b.sig));
}

/* ── Click ── */

function forceClick(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  el.click();
  // 对 React 组件再补一刀原生 click
  try { (el as any).__reactInternalInstance; } catch { /* noop */ }
}

/* ── Element Finders ── */

function findAllClickables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(
    'button, [role="button"], a[href="javascript:void(0)"], a[href="#"], ' +
    'span[class*="btn"], div[class*="btn"], span[class*="button"], div[class*="button"], ' +
    'span[class*="submit"], div[class*="submit"], li[class*="btn"], li[class*="button"], ' +
    'span[class*="publish"], div[class*="publish"], ' +
    '[class*="primary"], [class*="Primary"], ' +
    '.ant-btn, .el-button, .arco-btn, .btn, .button',
  )).filter(isVisible).filter((el) => !isDisabled(el));
}

function findPublishButton(): HTMLElement | null {
  return findButtonByText([
    '发布', '立即发布', '提交', '发布文章', '发表', '投稿',
    '确认发布', '提交发布', '发布图文',
  ]);
}

function findButtonInContainers(labels: string[]): HTMLElement | null {
  const containers = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], [role="alertdialog"], ' +
    '.modal, .dialog, .popover, .drawer, .panel, ' +
    '[class*="modal"], [class*="dialog"], [class*="popup"], [class*="drawer"], ' +
    '[class*="panel"], [class*="overlay"], [class*="mask"], ' +
    '[class*="Modal"], [class*="Dialog"], [class*="Popup"], [class*="Drawer"], ' +
    '[class*="Panel"], [class*="Overlay"]',
  )).filter(isVisible);

  for (const root of containers) {
    const btn = findButtonByText(labels, root);
    if (btn) return btn;
  }
  return null;
}

function findAllPublishTargets(): HTMLElement[] {
  const labels = ['发布', '提交', '确认', '确定', '投稿', '发表', '知道了', '好的', '是', '保存', '下一步', '继续'];
  return findAllClickables().filter((el) => {
    const text = compactText(el.innerText || el.textContent || '');
    return labels.some((l) => text === l || text.includes(l));
  });
}

function findButtonByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const elements = findAllClickablesInRoot(root);
  const candidates = elements
    .filter((el) => !isDisabled(el))
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((label) => text === label || text.includes(label)));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.text.length - a.text.length);
  return candidates[0]?.el || null;
}

function findAllClickablesInRoot(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(
    'button, [role="button"], a, span, div[class*="btn"], div[class*="button"], div[class*="submit"], ' +
    'span[class*="btn"], span[class*="button"], span[class*="submit"]',
  )).filter(isVisible);
}

/* ── Diagnostics ── */

function dumpPageState() {
  const allCE = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]'))
    .filter((el) => el.getBoundingClientRect().width > 0);
  console.log('[ContentBridge:Bilibili] contenteditable 元素:', allCE.length);
  allCE.slice(0, 5).forEach((el, i) => {
    console.log(`  [${i}]`, el.tagName, el.className.slice(0, 60), el.getBoundingClientRect());
  });

  const allFields = Array.from(document.querySelectorAll<HTMLElement>('input, textarea'))
    .filter((el) => el.getBoundingClientRect().width > 0);
  console.log('[ContentBridge:Bilibili] input/textarea 元素:', allFields.length);
  allFields.slice(0, 10).forEach((el, i) => {
    const inp = el as HTMLInputElement;
    console.log(`  [${i}]`, el.tagName, el.className?.slice(0, 60), inp.placeholder || '', inp.name || '');
  });
}

function dumpButtons() {
  const buttons = findAllClickables()
    .map((el) => ({ text: compactText(el.innerText || el.textContent || ''), className: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 40), el }))
    .filter(({ text }) => text);
  console.log('[ContentBridge:Bilibili] 可见按钮:', buttons.length);
  buttons.forEach(({ text, className }) => console.log(`  - "${text}"  [${className}]`));
}

function hasPublishSuccessSignal(): boolean {
  const text = compactText(document.body.innerText || '');
  return /发布成功|投稿成功|已发布|提交成功|审核中|已提交|发布完成|提交完成/.test(text);
}

/* ── Editor Finders ── */

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
    } catch { /* invalid selector */ }
  }
  return null;
}

/* ── Fill helpers ── */

async function fillTextTarget(el: HTMLElement, text: string): Promise<boolean> {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  await sleep(200);

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text);
    await sleep(100);
    return (el as HTMLInputElement).value.length > 0;
  }

  const before = compactText(el.innerText || el.textContent || '');

  if (selectAllContent(el) && document.execCommand('insertText', false, text)) {
    console.log('[ContentBridge:Bilibili] 填充策略: execCommand insertText');
    await sleep(300);
    const after = compactText(el.innerText || el.textContent || '');
    if (after !== before && after.length > 10) return true;
  }

  if (dispatchTextPaste(el, text)) {
    console.log('[ContentBridge:Bilibili] 填充策略: ClipboardEvent paste');
    await sleep(500);
    const after = compactText(el.innerText || el.textContent || '');
    if (after !== before && after.length > 10) return true;
  }

  console.log('[ContentBridge:Bilibili] 填充策略: innerHTML 兜底');
  el.innerHTML = markdownToHtml(text);
  el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
  el.blur();
  el.focus();
  await sleep(500);

  const afterHtml = compactText(el.innerText || el.textContent || '');
  if (afterHtml !== before && afterHtml.length > 10) return true;

  console.log('[ContentBridge:Bilibili] 填充策略: textContent 兜底');
  el.textContent = text;
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  await sleep(300);
  const afterText = compactText(el.innerText || el.textContent || '');
  return afterText !== before && afterText.length > 10;
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
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
  } catch {
    return false;
  }
}

/* ── DOM Utilities ── */

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
}

function isDisabled(el: HTMLElement): boolean {
  return el.hasAttribute('disabled')
    || el.getAttribute('aria-disabled') === 'true'
    || /\bdisabled\b/.test(el.className || '');
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
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

/* ── Markdown → HTML ── */

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
