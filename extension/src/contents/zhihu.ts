import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://zhuanlan.zhihu.com/*'],
  run_at: 'document_idle',
};

type ImagePayload = {
  id: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
};

type BodySegment = { kind: 'text'; value: string } | { kind: 'image'; image: ImagePayload };

const PLATFORM = 'zhihu';
const NAME = '知乎';

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;
  await chrome.storage.local.remove('contentbridge_fill');

  const { title, body } = fill.content as { title: string; body: string };

  // 图片从 Background 内存取（不走 storage，避免配额超限）
  let images: ImagePayload[] = [];
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES', payload: { platform: PLATFORM } });
    images = (resp?.images || []) as ImagePayload[];
  } catch { /* no images */ }

  // 分离封面图和正文图片
  const coverImage = images.find((img) => img.id === 'cover');
  const bodyImages = images.filter((img) => img.id !== 'cover');

  try {
    // 0. 上传封面图（如果有）
    if (coverImage) {
      await uploadCoverImage(coverImage);
      await sleep(1500); // 等上传服务端处理完
    }

    // 1. 找标题
    const titleEl = await waitFor(findTitleInput, 15000);
    if (!titleEl) return fail('未找到标题输入框，请确认知乎写文章页面已加载完成');

    // 2. 填标题
    const titleOk = await fillAndVerify(titleEl, title, 5000);
    if (!titleOk) return fail(`标题填充失败：${describeEl(titleEl)}`);

    // 3. 找正文编辑器
    const bodyEl = await waitFor(findBodyEditor, 15000);
    if (!bodyEl) return fail('未找到正文编辑器');

    // 4. 正文：将 body 拆为段落序列，文字直接粘贴，图片上传插入
    const segments = buildBodySegments(body, bodyImages);
    let hasContent = false;
    for (const seg of segments) {
      if (seg.kind === 'text') {
        const trimmed = seg.value.trim();
        if (trimmed) {
          pasteHtml(bodyEl, trimmed);
          await sleep(500);
          hasContent = true;
        }
      } else {
        const ok = await uploadBodyImage(bodyEl, seg.image);
        if (ok) hasContent = true;
        await sleep(800);
      }
    }

    if (!hasContent) return fail('正文为空且无图片');

    // 5. 等图片上传服务端处理完
    await sleep(1500);
    const publishBtn = await waitFor(findPublishButton, 15000);
    if (!publishBtn) return fail('未找到发布按钮');
    if (isDisabled(publishBtn)) return fail('发布按钮不可用 — 标题或正文为空');

    // 6. 点击发布 → 确认弹窗
    clickEl(publishBtn);
    await sleep(1000);
    for (let i = 0; i < 4; i++) {
      const confirmBtn = findConfirmButton();
      if (!confirmBtn) break;
      clickEl(confirmBtn);
      await sleep(800);
    }
    done('知乎文章已自动提交发布');
  } catch (err) {
    fail(err instanceof Error ? err.message : '知乎发布失败');
  }
})();

/* ── 将 body 解析为 [文字, 图片, 文字, 图片, ...] 段落序列 ── */

function buildBodySegments(html: string, bodyImages: ImagePayload[]): BodySegment[] {
  const segments: BodySegment[] = [];
  // 用正则匹配 <img src="data:..."> 或 ![alt](data:...) 作为图片占位符
  const IMG_RE = /(<img[^>]*src\s*=\s*["']data:image\/[^"']*["'][^>]*\/?>)|(!\[[^\]]*\]\(data:image\/[^)]+\))/gi;
  let lastIdx = 0;
  let imgIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = IMG_RE.exec(html)) !== null) {
    // 前面文字
    const textBefore = html.slice(lastIdx, match.index);
    if (textBefore.trim()) {
      segments.push({ kind: 'text', value: textBefore });
    }
    // 图片（按顺序匹配 bodyImages）
    if (imgIdx < bodyImages.length) {
      segments.push({ kind: 'image', image: bodyImages[imgIdx] });
      imgIdx++;
    }
    lastIdx = IMG_RE.lastIndex;
  }
  // 尾部文字
  const tail = html.slice(lastIdx);
  if (tail.trim()) {
    segments.push({ kind: 'text', value: tail });
  }

  // 如果 bodyImages 比 HTML 中多，剩余的插图追加在末尾
  while (imgIdx < bodyImages.length) {
    segments.push({ kind: 'image', image: bodyImages[imgIdx] });
    imgIdx++;
  }

  return segments;
}

/* ── 封面图上传 ── */

function findCoverUploadArea(): HTMLElement | null {
  // 知乎写文章页封面图区域：通常有 "添加封面" 文本，或独立的封面图上传按钮
  const coverSelectors = [
    '[class*="Cover"]',
    '[class*="cover"]',
    '.ArticleCover',
    '.WriteIndex-cover',
  ];
  for (const sel of coverSelectors) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && isVisible(el)) return el;
    } catch { /* skip */ }
  }

  // 兜底：页面顶部区域的 file input（不与正文编辑器重叠）
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'))
    .filter((el) => el.getAttribute('accept')?.includes('image') || !el.getAttribute('accept'));
  // 排除正文编辑器内部的 file input
  const bodyEditors = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]'))
    .filter(isVisible);
  for (const input of fileInputs) {
    const inputRect = input.getBoundingClientRect();
    const isInsideEditor = bodyEditors.some((ed) => {
      const r = ed.getBoundingClientRect();
      return inputRect.top >= r.top && inputRect.bottom <= r.bottom;
    });
    if (!isInsideEditor) return input;
  }
  return null;
}

async function uploadCoverImage(img: ImagePayload): Promise<boolean> {
  try {
    const blob = dataUrlToBlob(img.dataUrl);
    const file = new File([blob], img.filename || 'cover.png', { type: img.mimeType || 'image/png' });

    // 先尝试找封面专用的文件上传区域
    const coverArea = findCoverUploadArea();
    if (!coverArea) {
      console.warn('[zhihu] 未找到封面图上传区域，跳过封面');
      return false;
    }

    // 如果是 input[type=file]，直接用原生 setter
    if (coverArea instanceof HTMLInputElement && coverArea.type === 'file') {
      setInputFiles(coverArea, file);
      await sleep(2000); // 等上传完成
      return true;
    }

    // 否则是按钮/容器，点击触发后找 file input
    clickEl(coverArea);
    await sleep(500);
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) {
      setInputFiles(fileInput, file);
      await sleep(2000);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[zhihu] 封面上传异常:', err);
    return false;
  }
}

/* ── 通用：给 input[type=file] 设文件（绕过 React 合成事件） ── */

const nativeFilesSetter = (() => {
  try {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
    return desc?.set || null;
  } catch { return null; }
})();

function setInputFiles(input: HTMLInputElement, file: File): void {
  const dt = new DataTransfer();
  dt.items.add(file);
  if (nativeFilesSetter) {
    // 走原生 setter，React 才能感知变化
    nativeFilesSetter.call(input, dt.files);
  } else {
    // 兜底
    input.files = dt.files;
  }
  // React 17+ 用原生事件监听，dispatch 原生事件即可
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/* ── 正文图片上传 —— 跟封面上传同样的简单链路 ── */

async function uploadBodyImage(bodyEl: HTMLElement, img: ImagePayload): Promise<boolean> {
  try {
    const blob = dataUrlToBlob(img.dataUrl);
    const file = new File([blob], img.filename || 'image.png', { type: img.mimeType || 'image/png' });

    // 编辑器聚焦
    bodyEl.focus();
    bodyEl.click();
    await sleep(300);

    // 跟封面上传完全一样的思路：找页面上 accept="image/*" 的 file input
    // 封面那条兜底逻辑恰好找到的就是它——所以封面能上传到编辑器
    const fileInput = findEditorImageInput();
    if (!fileInput) {
      console.warn('[zhihu] 未找到正文图片上传 input');
      return false;
    }

    setInputFiles(fileInput, file);
    return await waitForImageInBody(bodyEl, 30000);
  } catch (err) {
    console.warn('[zhihu] 正文图片上传异常:', img.filename, err);
    return false;
  }
}

/** 找编辑器关联的图片 file input（跟封面那条兜底逻辑一致） */
function findEditorImageInput(): HTMLInputElement | null {
  const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));

  // 优先：accept 含 image 的
  const imageInputs = allInputs.filter(
    (el) => (el.getAttribute('accept') || '').toLowerCase().includes('image'),
  );
  if (imageInputs.length > 0) return imageInputs[0];

  // 其次：任意 file input
  return allInputs.length > 0 ? allInputs[0] : null;
}

function waitForImageInBody(bodyEl: HTMLElement, timeout: number): Promise<boolean> {
  const before = bodyEl.querySelectorAll('img').length;
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (bodyEl.querySelectorAll('img').length > before) {
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(bodyEl, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(bodyEl.querySelectorAll('img').length > before);
    }, timeout);
  });
}

/* ── data URL → Blob ── */

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

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

/* ── 标题 ── */

function findTitleInput(): HTMLElement | null {
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

  const wrapper = document.querySelector<HTMLElement>(
    '[placeholder="请输入标题"], [data-placeholder="请输入标题"]',
  );
  if (wrapper) {
    const inner = wrapper.querySelector<HTMLElement>('textarea, input, [contenteditable="true"]');
    if (inner && isVisible(inner)) return inner;
  }

  const all = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"], textarea, input[type="text"]'))
    .filter(isVisible)
    .filter((el) => {
      const h = el.getBoundingClientRect().height;
      return h > 20 && h < 100;
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

/* ── 标题填充 ── */

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

  if (tag === 'textarea' || tag === 'input') {
    setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, text);
    if (readText(el).length > 0) return true;
  }

  el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
  el.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: text }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  if (readText(el).length > 0) return true;

  try {
    selectAll(el);
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    dt.setData('text/html', text.replace(/\n/g, '<br>'));
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    if (readText(el).length > 0) return true;
  } catch { /* ignore */ }

  selectAll(el);
  document.execCommand('insertText', false, text);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  if (readText(el).length > 0) return true;

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

/* ── 发布按钮 ── */

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
  // Full native event sequence
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  // React fiber fallback — walk up looking for onClick handler
  const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
  if (fiberKey) {
    let fiber = (el as any)[fiberKey];
    for (let depth = 0; fiber && depth < 30; depth++) {
      const props = fiber.memoizedProps || fiber.pendingProps || {};
      const handlerNames = ['onClick', 'onMouseDown', 'onPointerDown', 'onPress'];
      for (const name of handlerNames) {
        if (typeof props[name] === 'function') {
          try { props[name](new MouseEvent('click', { bubbles: true, cancelable: true })); return; } catch { /* */ }
        }
      }
      fiber = fiber.return;
    }
  }
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
