import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://weibo.com/*', 'https://www.weibo.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

const PLATFORM = 'weibo';
const NAME = '微博';
const FILL_TIMEOUT = 40000;

(async function init() {
  const data = await chrome.storage.local.get(`contentbridge_fill_${PLATFORM}`);
  const fill = data[`contentbridge_fill_${PLATFORM}`];
  if (!fill || fill.platform !== PLATFORM) return;

  try {
    const { title, body, tags } = fill.content as { title: string; body: string; tags: string[] };
    console.log('[WB] 开始填充', { title: title.slice(0, 30), bodyLen: body.length, tags });

    // Step 1: activate editor (click to expand if collapsed)
    const editor = await activateEditor();
    if (!editor) {
      if (window.top !== window) return;
      dumpPageState();
      await chrome.storage.local.remove(`contentbridge_fill_${PLATFORM}`);
      await chrome.storage.local.set({
        [`contentbridge_result_${PLATFORM}`]: { platform: PLATFORM, platformName: NAME, success: false, message: '未找到微博发布编辑器' },
      });
      showContentBridgeToast('微博填充失败：未找到编辑器', 'error');
      return;
    }

    // Step 2: fill text content
    const weiboContent = buildWeiboContent(title, body, tags);
    await fillEditor(editor, weiboContent);
    console.log('[WB] 文本填充完成');

    // Step 3: upload images
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES', payload: { platform: PLATFORM } });
      const allImages = (resp?.images || []) as { id: string; dataUrl: string; filename: string; mimeType: string }[];
      const bodyImages = allImages.filter((img: { id: string }) => img.id !== 'cover');
      console.log('[WB-IMG] 图片:', bodyImages.length, '张');

      if (bodyImages.length > 0) {
        // Diagnostic: dump Weibo config
        dumpWeiboConfig();

        let uploadedCount = 0;
        for (const img of bodyImages) {
          const ok = await uploadImage(editor, img);
          console.log('[WB-IMG] 上传结果:', ok ? 'OK' : 'FAIL');
          if (ok) { uploadedCount++; await sleep(2000); }
          else {
            // One failure might be a fluke, but consecutive failures mean strategy doesn't work
            console.log('[WB-IMG] 上传失败，跳过后续图片');
            break;
          }
        }
        if (uploadedCount === 0 && bodyImages.length > 0) {
          console.log('[WB-IMG] 所有图片上传策略均失败，将仅发布文字内容');
        }
      }
      await sleep(1500);
    } catch (e) { console.log('[WB-IMG] err:', e); }

    // Step 4: auto publish
    console.log('[WB] 开始自动发布');
    const published = await tryAutoPublish();
    await chrome.storage.local.remove(`contentbridge_fill_${PLATFORM}`);
    await chrome.storage.local.set({
      [`contentbridge_result_${PLATFORM}`]: {
        platform: PLATFORM, platformName: NAME,
        success: published.success, message: published.message,
        error: published.success ? undefined : published.message,
      },
    });
    showContentBridgeToast(published.message, published.success ? 'success' : 'error');
  } catch (err) {
    await chrome.storage.local.remove(`contentbridge_fill_${PLATFORM}`);
    const msg = err instanceof Error ? err.message : '微博自动发布失败';
    await chrome.storage.local.set({
      [`contentbridge_result_${PLATFORM}`]: { platform: PLATFORM, platformName: NAME, success: false, message: msg },
    });
    showContentBridgeToast(msg, 'error');
  }
})();

/* ── Editor Activation ── */

async function activateEditor(): Promise<HTMLElement | null> {
  // First try to find an already visible/active editor
  let editor = findWeiboEditor();
  if (editor) {
    console.log('[WB] 编辑器已就绪:', describe(editor));
    // Click to focus and expand
    editor.focus();
    editor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(500);
    return editor;
  }

  // If not found, try to click the "quick post" trigger area
  const triggers = [
    'textarea[placeholder*="发布"]', 'textarea[placeholder*="微博"]',
    'textarea[placeholder*="分享"]', 'textarea[placeholder*="新鲜"]',
    'div[class*="publish"]', 'div[class*="feed"] [class*="input"]',
  ];
  for (const sel of triggers) {
    try {
      const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
      if (el) {
        console.log('[WB] 点击展开:', describe(el));
        tryAllClickStrategies(el);
        await sleep(1000);
        editor = findWeiboEditor();
        if (editor) return editor;
      }
    } catch { /* */ }
  }

  return findWeiboEditor();
}

function findWeiboEditor(): HTMLElement | null {
  const selectors = [
    'textarea[placeholder*="发布"]', 'textarea[placeholder*="微博"]',
    'textarea[placeholder*="分享"]', 'textarea[placeholder*="新鲜"]',
    'textarea[class*="Form"]', 'textarea[class*="input"]',
    'textarea[class*="publish"]', 'textarea[class*="content"]',
    'textarea[class*="editor"]', 'textarea[class*="weibo"]',
    'textarea[class*="text"]', 'textarea[class*="write"]',
    'textarea[class*="post"]', 'textarea[class*="feed"]',
    '.WB_editor_iframe textarea', '.WB_feed_publish textarea',
    '.wbpro-feed-publish textarea', 'textarea[node-type="textEl"]',
    'div[contenteditable="true"][class*="publish"]',
    'div[contenteditable="true"][class*="editor"]',
    'div[contenteditable="true"][class*="feed"]',
    'div[contenteditable="true"][class*="weibo"]',
    'div[contenteditable="true"][role="textbox"]',
  ];

  for (const sel of selectors) {
    try {
      const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
      if (el) { console.log('[WB] 编辑器匹配:', sel); return el; }
    } catch { /* */ }
  }

  const textareas = (Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[])
    .filter(isVisible)
    .map((el) => ({ el, area: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
    .filter(({ area }) => area > 1000)
    .sort((a, b) => b.area - a.area);
  if (textareas[0]) { console.log('[WB] 兜底textarea area:', textareas[0].area); return textareas[0].el; }

  return null;
}

/* ── Content ── */

function buildWeiboContent(title: string, body: string, tags: string[]): string {
  const cleanBody = stripAllImageRefs(body).replace(/<[^>]*>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const parts: string[] = [];
  if (title && !cleanBody.startsWith(title)) { parts.push(`【${title.replace(/#/g, '')}】`); parts.push(''); }
  parts.push(cleanBody);
  if (tags.length > 0) {
    parts.push('');
    parts.push(tags.map((t) => `#${t.replace(/#/g, '').trim()}#`).join(' '));
  }
  return parts.join('\n');
}

async function fillEditor(el: HTMLElement, text: string): Promise<void> {
  el.scrollIntoView({ block: 'center' });
  el.focus();
  await sleep(300);

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (el.getAttribute('contenteditable') === 'true') {
    const before = compactText(el.innerText || el.textContent || '');
    if (selectAllContent(el)) {
      document.execCommand('insertText', false, text);
      await sleep(300);
      if (compactText(el.innerText || el.textContent || '') !== before) return;
    }
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // Try inner textarea
  const inner = el.querySelector<HTMLTextAreaElement>('textarea');
  if (inner) {
    setNativeValue(inner, text);
    inner.dispatchEvent(new Event('input', { bubbles: true }));
    inner.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/* ── Image Upload ── */

function _dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uploadImage(
  editor: HTMLElement,
  img: { dataUrl: string; filename: string; mimeType: string },
): Promise<boolean> {
  const blob = _dataUrlToBlob(img.dataUrl);
  const file = new File([blob], img.filename || 'img.png', { type: img.mimeType || 'image/png' });

  // Strategy 1: Call Weibo's internal upload via React fiber traversal
  const uploadFn = findUploadFnInFiber(editor);
  if (uploadFn) {
    console.log('[WB-IMG] 找到 React 上传函数，尝试调用');
    try {
      uploadFn(file);
      await sleep(4000);
      if (hasImageInPage()) { console.log('[WB-IMG] fiber 上传成功'); return true; }
    } catch (e) { console.log('[WB-IMG] fiber upload err:', e); }
  }

  // Strategy 2: Call Weibo's pic upload API directly (with cookies)
  console.log('[WB-IMG] 尝试 API 直连上传');
  const pid = await uploadToWeiboAPI(file);
  if (pid) {
    console.log('[WB-IMG] API 上传成功, pid:', pid);
    const inserted = await insertImageHtml(editor, pid);
    if (inserted) return true;
  }

  // Strategy 3: ClipboardEvent paste (last resort)
  editor.focus();
  await sleep(200);
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: dt,
    }));
    await sleep(3000);
    if (hasImageInPage()) { console.log('[WB-IMG] paste 成功'); return true; }
  } catch (e) { /* */ }

  // Strategy 4: click image button, let real dialog open, inject file on created input
  const ok = await clickImageBtnAndInject(file);
  if (ok) return true;

  return false;
}

/* ── Strategy 1: Find upload function in React fiber ── */

function findUploadFnInFiber(startEl: HTMLElement): ((file: File) => void) | null {
  // Walk up the DOM tree looking for React fibers with upload-related props
  let el: HTMLElement | null = startEl;
  for (let i = 0; i < 15 && el; i++) {
    const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    if (fiberKey) {
      let fiber = (el as any)[fiberKey];
      for (let depth = 0; fiber && depth < 30; depth++) {
        const props = fiber.memoizedProps || fiber.pendingProps || {};
        // Common Weibo upload handler prop names
        for (const key of ['onUpload', 'uploadPic', 'handleUpload', 'onImageUpload', 'onFileChange', 'onAddPic', 'uploadImage', 'onPicUpload']) {
          if (typeof props[key] === 'function') {
            console.log('[WB-IMG] fiber upload fn:', key);
            return (file: File) => props[key]({ file, target: { files: [file] } });
          }
        }
        // Check hooks (useCallback, useMemo)
        if (fiber.memoizedState) {
          let hook = fiber.memoizedState;
          for (let h = 0; h < 20 && hook; h++) {
            if (hook.memoizedState && typeof hook.memoizedState === 'function') {
              const fn = hook.memoizedState;
              if (fn.name && /upload|pic|image/i.test(fn.name)) {
                console.log('[WB-IMG] fiber hook fn:', fn.name);
                return (file: File) => fn(file);
              }
            }
            hook = hook.next;
          }
        }
        fiber = fiber.return;
      }
    }
    el = el.parentElement;
  }
  return null;
}

/* ── Strategy 2: Weibo pic upload API ── */

interface WeiboConfig {
  st?: string;
  uid?: string;
  crossid?: string;
}

function getWeiboConfig(): WeiboConfig {
  const config: WeiboConfig = {};
  try {
    const w = window as any;
    // $CONFIG is Weibo's standard page config
    if (w.$CONFIG) {
      config.st = w.$CONFIG.st;
      config.uid = w.$CONFIG.uid;
      config.crossid = w.$CONFIG.crossid;
    }
    // Also check cookies for SUB token
    if (!config.st) {
      const m = document.cookie.match(/(?:^|;\s*)SUB=([^;]*)/);
      if (m) config.st = m[1];
    }
  } catch (e) { /* */ }
  return config;
}

async function uploadToWeiboAPI(file: File): Promise<string | null> {
  const config = getWeiboConfig();
  console.log('[WB-IMG] config:', config.uid ? `uid=${config.uid}` : 'no uid', config.st ? 'has st' : 'no st');

  // Weibo's pic upload endpoint (several possible URLs)
  const endpoints = [
    'https://picupload.weibo.com/interface/pic_upload.php',
    'https://picupload.weibo.com/interface/pic_upload_new.php',
  ];

  for (const url of endpoints) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'json');
      fd.append('app', 'miniblog');
      fd.append('rotate', '0');
      fd.append('marks', '0');
      fd.append('url', '0');
      if (config.st) {
        fd.append('st', config.st);
        fd.append('_sprite', 'lyrl6z');
      }

      const resp = await fetch(url, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      const text = await resp.text();
      console.log('[WB-IMG] upload response:', text.slice(0, 200));

      try {
        const data = JSON.parse(text);
        if (data.code === '100000' && data.data?.pics) {
          const firstKey = Object.keys(data.data.pics)[0];
          const pid = data.data.pics[firstKey]?.pid;
          if (pid) return pid;
        }
      } catch { /* not JSON */ }
    } catch (e) {
      console.log('[WB-IMG] upload err:', url, e);
    }
  }

  return null;
}

async function insertImageHtml(editor: HTMLElement, pid: string): Promise<boolean> {
  // Weibo image URL pattern
  const imgHtml = `<img src="https://wx1.sinaimg.cn/large/${pid}.jpg" alt="" />`;
  const imgText = `[img]${pid}[/img]`;

  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    // Append image markdown-like text
    const current = editor.value || '';
    setNativeValue(editor, current ? `${current}\n${imgText}` : imgText);
    await sleep(500);
    return true;
  }

  if (editor.getAttribute('contenteditable') === 'true') {
    // Insert img element
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand('insertHTML', false, imgHtml);
    await sleep(1000);
    if (hasImageInPage()) return true;

    // Fallback: append to innerHTML
    editor.innerHTML += imgHtml;
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await sleep(500);
    return hasImageInPage();
  }

  return false;
}

/* ── Strategy 4: Click image button + inject (no prototype hijack) ── */

function clickImageBtnAndInject(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const imgBtn = findImageButton();
    if (!imgBtn) { console.log('[WB-IMG] 未找到图片按钮'); resolve(false); return; }

    // Watch for file input creation by Weibo's own click handler
    let resolved = false;
    const done = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      observer.disconnect();
      resolve(result);
    };

    const timeout = setTimeout(() => done(false), 8000);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLInputElement && node.type === 'file') {
            console.log('[WB-IMG] 检测到 file input 创建，注入文件');
            // Wait a tick for Weibo to attach event listeners
            setTimeout(() => {
              const dt = new DataTransfer();
              dt.items.add(file);
              const nativeFS = (() => {
                try { return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set || null; }
                catch { return null; }
              })();
              if (nativeFS) nativeFS.call(node, dt.files);
              else node.files = dt.files;
              node.dispatchEvent(new Event('input', { bubbles: true }));
              node.dispatchEvent(new Event('change', { bubbles: true }));
              if (node.parentElement) {
                node.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
              }
              // Check after upload completes
              setTimeout(async () => {
                await sleep(3000);
                done(hasImageInPage());
              }, 100);
            }, 200);
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    console.log('[WB-IMG] 点击图片按钮:', describe(imgBtn));
    tryAllClickStrategies(imgBtn);
  });
}

function findImageButton(): HTMLElement | null {
  const selectors = [
    '[title*="图片"]', '[title*="照片"]', '[title*="相册"]',
    '[aria-label*="图片"]', '[aria-label*="照片"]',
    '[class*="toolbar"] [class*="image"]', '[class*="toolbar"] [class*="photo"]',
    '[class*="toolbar"] [class*="pic"]',
    '.woo-picture-tool', '.toolbarIcon_pic', '.func_icon_pic',
    'a[action-type*="image"]', 'a[action-type*="photo"]', 'a[action-type*="pic"]',
    '.WB_editor_sideToolBar .W_btn_b',
    '.woo-panel-toolbar [class*="pic"]', '.woo-panel-toolbar [class*="img"]',
    '[class*="publish"] [class*="pic"]',
    '[class*="feed"] [class*="image"]',
    'svg[class*="pic"]', 'svg[class*="image"]',
    '.FuncBar [class*="pic"]', '.FuncBar [class*="img"]',
    '.toolbarIcon_pic', '.PCD_publisher_pic',
  ];

  for (const sel of selectors) {
    try {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isVisible);
      if (els.length > 0) { console.log('[WB-IMG] 图片按钮:', sel); return els[0]; }
    } catch { /* */ }
  }

  const all = Array.from(document.querySelectorAll<HTMLElement>('[title], [aria-label]')).filter(isVisible);
  for (const el of all) {
    const t = (el.getAttribute('title') || el.getAttribute('aria-label') || '').trim();
    if (t === '图片' || t === '照片') { console.log('[WB-IMG] title兜底:', t); return el; }
  }

  return null;
}

function hasImageInPage(): boolean {
  return document.querySelectorAll(
    'img[src*="sinaimg"], img[src*="weibo"], img[src*="wbimg"], [class*="upload"] img, [class*="preview"] img, [class*="thumbnail"] img',
  ).length > 0;
}

/* ── Auto Publish ── */

const PUBLISH_LABELS = ['发布', '发送', '发表', '发布微博', '发送微博', '确认发布'];
const CONFIRM_LABELS = ['确认', '确定', '发布', '发送'];

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(800);

  // First, try to ensure the publish button is enabled
  // (Weibo may keep it disabled until the editor's React state updates)
  await ensurePublishButtonEnabled();

  // Try to find the publish button — first by text, then by Weibo-specific selectors
  const publishBtn = findPublishButton();
  if (!publishBtn) {
    dumpAllTexts();
    return { success: false, message: '未找到微博发布按钮，内容已填充，请手动点击发布' };
  }

  console.log('[WB] 发布按钮:', describe(publishBtn), '| tag:', publishBtn.tagName, '| disabled:', isDisabled(publishBtn));

  // Try all strategies to click the publish button
  const clicked = tryAllClickStrategies(publishBtn);
  console.log('[WB] 发布按钮点击结果:', clicked);
  await sleep(1000);

  if (hasPublishSuccessSignal()) return { success: true, message: '微博已自动发布' };

  // Look for confirmation dialogs and click through them
  for (let round = 0; round < 6; round++) {
    await sleep(800);
    if (hasPublishSuccessSignal()) return { success: true, message: '微博已自动发布' };

    const confirmBtn = findButtonByText(CONFIRM_LABELS);
    if (confirmBtn) {
      console.log('[WB] 确认按钮:', describe(confirmBtn));
      tryAllClickStrategies(confirmBtn);
      await sleep(500);
      if (hasPublishSuccessSignal()) return { success: true, message: '微博已自动发布' };
    }
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: '微博已自动发布' }
    : { success: false, message: '微博内容已填充，请在页面确认后手动点击发布' };
}

/**
 * Try to enable the publish button if it's disabled.
 * Weibo uses controlled React inputs — the button stays disabled
 * until the editor's onChange fires and updates component state.
 */
async function ensurePublishButtonEnabled() {
  // Find the editor and re-dispatch input events to wake up React
  const editor = findWeiboEditor();
  if (editor) {
    console.log('[WB] 重新触发编辑器事件以确保按钮可用');
    editor.focus();

    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      // Read current value, clear and restore to trigger React
      const current = editor.value;
      if (current) {
        const proto = editor instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        // Force a change that React can detect
        desc?.set?.call(editor, '');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(100);
        desc?.set?.call(editor, current);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: current, composed: true }));
      }
    } else if (editor.getAttribute('contenteditable') === 'true') {
      // For contenteditable, dispatch composition events
      editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      editor.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: editor.textContent || '' }));
      editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: editor.textContent || '' }));
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }
  }

  // Wait briefly for React to re-render
  await sleep(500);

  // If there's a disabled publish button, try to remove the disabled state
  for (const label of PUBLISH_LABELS) {
    const btns = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter(isVisible)
      .filter((el) => {
        const text = compactText(el.innerText || el.textContent || '');
        return text === label;
      });
    for (const btn of btns) {
      if (isDisabled(btn)) {
        console.log('[WB] 发布按钮被禁用，尝试启用');
        btn.removeAttribute('disabled');
        btn.setAttribute('aria-disabled', 'false');
        // Remove disabled class patterns
        if (btn.className && typeof btn.className === 'string') {
          btn.className = btn.className.replace(/\bdisabled\b/gi, '').replace(/\bdisable\b/gi, '');
        }
      }
    }
  }
}

/* ── Publish Button Discovery ── */

function findPublishButton(): HTMLElement | null {
  // Priority 1: Weibo's woo-button with publish text
  const wooBtn = findWooPublishButton();
  if (wooBtn) { console.log('[WB] 通过 woo-button 选择器找到发布按钮'); return wooBtn; }

  // Priority 2: text-based search
  const textBtn = findButtonByText(PUBLISH_LABELS);
  if (textBtn) { console.log('[WB] 通过文本匹配找到发布按钮'); return textBtn; }

  // Priority 3: broad button search near the editor area
  return findPublishButtonNearEditor();
}

/** Find Weibo's woo-button-primary that contains publish text */
function findWooPublishButton(): HTMLElement | null {
  const selectors = [
    '.woo-button-primary', '.woo-button-main',
    'button[class*="woo-button"]',
    '[class*="publish"] button', '[class*="submit"] button',
    'button[class*="primary"]', 'button[class*="send"]',
  ];
  for (const sel of selectors) {
    try {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel))
        .filter(isVisible)
        .filter((el) => !isDisabled(el));
      for (const el of els) {
        const text = compactText(el.innerText || el.textContent || '');
        if (PUBLISH_LABELS.some((l) => text === l || text.includes(l))) {
          return el;
        }
      }
    } catch { /* */ }
  }
  return null;
}

/** Find publish button in the vicinity of the editor */
function findPublishButtonNearEditor(): HTMLElement | null {
  // Look for toolbars/action bars near the bottom of the page or near the editor
  const containers = document.querySelectorAll<HTMLElement>(
    '[class*="toolbar"], [class*="action"], [class*="submit"], [class*="footer"], [class*="publish"]',
  );
  for (const container of containers) {
    if (!isVisible(container)) continue;
    const btns = Array.from(container.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter(isVisible)
      .filter((el) => !isDisabled(el));
    for (const btn of btns) {
      const text = compactText(btn.innerText || btn.textContent || '');
      if (PUBLISH_LABELS.some((l) => text === l || text.startsWith(l))) {
        return btn;
      }
    }
  }
  return null;
}

function findButtonByText(labels: string[]): HTMLElement | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement;
      if (!isVisible(el) || isDisabled(el)) return NodeFilter.FILTER_SKIP;
      const text = compactText(el.innerText || el.textContent || '');
      if (!text || text.length > 20) return NodeFilter.FILTER_SKIP;
      if (labels.some((l) => text === l || text.startsWith(l) || text.endsWith(l))) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });
  const candidates: HTMLElement[] = [];
  let node = walker.nextNode();
  while (node) { candidates.push(node as HTMLElement); node = walker.nextNode(); }
  // Prefer buttons over spans/divs
  candidates.sort((a, b) => {
    const aIsBtn = a.tagName === 'BUTTON' ? 0 : 1;
    const bIsBtn = b.tagName === 'BUTTON' ? 0 : 1;
    if (aIsBtn !== bIsBtn) return aIsBtn - bIsBtn;
    return compactText(a.innerText || a.textContent || '').length - compactText(b.innerText || b.textContent || '').length;
  });
  return candidates[0] || null;
}

/* ── Multi-Strategy Click ── */

/**
 * Try EVERY possible way to click a Weibo button.
 * Weibo uses React with synthetic events — a simple el.click() often isn't enough
 * because handlers may be attached via event delegation, React portals, or custom
 * event system. We throw everything at it.
 */
function tryAllClickStrategies(el: HTMLElement): boolean {
  el.scrollIntoView({ block: 'center' });
  el.focus();

  let success = false;

  // Strategy 1: Full native event sequence (pointer + mouse + click)
  console.log('[WB-click] S1: 原生事件序列');
  dispatchFullClickSequence(el);

  // Strategy 2: React fiber event handlers — scan deep and wide
  console.log('[WB-click] S2: React fiber 遍历');
  const fiberResult = triggerReactHandler(el);
  if (fiberResult) { console.log('[WB-click] S2 成功:', fiberResult); success = true; }

  // Strategy 3: Try the native .click() again after a microtick
  setTimeout(() => {
    try { el.click(); } catch { /* */ }
  }, 0);

  // Strategy 4: Form submission — find parent form and submit
  const form = el.closest('form');
  if (form) {
    console.log('[WB-click] S4: 表单提交');
    try {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      // Also try requestSubmit (native, not preventable) as last resort
      setTimeout(() => {
        try { form.requestSubmit(); } catch { /* requestSubmit may not exist */ }
      }, 100);
    } catch { /* */ }
  }

  // Strategy 5: Keyboard Enter on the button
  console.log('[WB-click] S5: 键盘事件');
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
  el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));

  // Strategy 6: Direct React DOM property access (try __reactProps)
  const reactPropsKey = Object.keys(el).find((k) => k.startsWith('__reactProps'));
  if (reactPropsKey) {
    const props = (el as any)[reactPropsKey];
    if (props?.onClick) {
      console.log('[WB-click] S6: __reactProps.onClick');
      try { props.onClick(new MouseEvent('click', { bubbles: true })); success = true; } catch { /* */ }
    }
    if (props?.onMouseDown) {
      try { props.onMouseDown(new MouseEvent('mousedown', { bubbles: true })); } catch { /* */ }
    }
  }

  // Strategy 7: Touch events (mobile Weibo)
  el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [] }));
  el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [] }));

  return success;
}

/** Dispatch a complete native click sequence */
function dispatchFullClickSequence(el: HTMLElement) {
  const baseInit = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new PointerEvent('pointerover', { ...baseInit, pointerId: 1 }));
  el.dispatchEvent(new PointerEvent('pointerenter', { ...baseInit, pointerId: 1 }));
  el.dispatchEvent(new MouseEvent('mouseover', baseInit));
  el.dispatchEvent(new MouseEvent('mouseenter', baseInit));
  el.dispatchEvent(new PointerEvent('pointerdown', { ...baseInit, pointerId: 1 }));
  el.dispatchEvent(new MouseEvent('mousedown', baseInit));
  el.dispatchEvent(new FocusEvent('focus', baseInit));
  el.dispatchEvent(new PointerEvent('pointerup', { ...baseInit, pointerId: 1 }));
  el.dispatchEvent(new MouseEvent('mouseup', baseInit));
  // The critical one
  el.click();
  // Also dispatch a standalone click event
  el.dispatchEvent(new MouseEvent('click', baseInit));
}

/**
 * Walk the React fiber tree looking for any event handler that could trigger
 * the publish action. Goes deeper (50 levels) and checks more handler names.
 */
function triggerReactHandler(el: HTMLElement): string | null {
  const fiberKey = Object.keys(el).find(
    (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'),
  );
  if (!fiberKey) {
    console.log('[WB-click] 未找到 React fiber key');
    return null;
  }

  // Also check __reactEvents for direct event binding (React 17+)
  const reactEventsKey = Object.keys(el).find((k) => k.startsWith('__reactEvents'));
  if (reactEventsKey) {
    const events = (el as any)[reactEventsKey];
    console.log('[WB-click] 找到 __reactEvents:', Object.keys(events || {}));
  }

  let fiber = (el as any)[fiberKey];

  // Check the element's own fiber AND walk up
  for (let depth = 0; fiber && depth < 50; depth++) {
    const allProps = { ...(fiber.memoizedProps || {}), ...(fiber.pendingProps || {}) };
    const handled = tryInvokeHandler(allProps);
    if (handled) {
      console.log(`[WB-click] fiber depth=${depth} handler: ${handled}`);
      return handled;
    }

    // Also check stateNode for class component instances
    if (fiber.stateNode && fiber.stateNode !== el) {
      const stateProps = fiber.stateNode.props || {};
      const handled2 = tryInvokeHandler(stateProps);
      if (handled2) {
        console.log(`[WB-click] stateNode depth=${depth} handler: ${handled2}`);
        return handled2;
      }
    }

    // Check sibling fibers too (event delegation on parent)
    if (fiber.sibling) {
      let sib = fiber.sibling;
      for (let s = 0; sib && s < 5; s++) {
        const sibProps = { ...(sib.memoizedProps || {}), ...(sib.pendingProps || {}) };
        const handled3 = tryInvokeHandler(sibProps);
        if (handled3) {
          console.log(`[WB-click] sibling depth=${depth} sib=${s} handler: ${handled3}`);
          return handled3;
        }
        sib = sib.sibling;
      }
    }

    fiber = fiber.return;
  }

  return null;
}

/**
 * Try to invoke any click-related handler from a props object.
 * Covers all common React event handler naming conventions.
 */
function tryInvokeHandler(props: Record<string, unknown>): string | null {
  if (!props || typeof props !== 'object') return null;

  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
  const pointerEvent = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 });

  // Priority-ordered list of handler names to try
  const handlerNames = [
    // Direct click handlers
    'onClick', 'onTap', 'onPress', 'handleClick', 'handleSubmit',
    // Mouse/pointer handlers that might trigger publish
    'onMouseDown', 'onPointerDown', 'onPointerUp',
    // Touch handlers
    'onTouchEnd', 'onTouchStart',
    // Custom Weibo handler names
    'onSubmit', 'onPublish', 'onSend', 'doPublish', 'handlePublish',
    // Generic action handlers
    'onAction', 'onConfirm',
    // Form-level handlers
    'onFinish',
  ];

  for (const name of handlerNames) {
    const fn = props[name];
    if (typeof fn === 'function') {
      try {
        // Try with both MouseEvent and PointerEvent
        fn(clickEvent);
        return name;
      } catch {
        try { fn(pointerEvent); return name; } catch { /* */ }
      }
    }
  }

  // Check for bound/dispatched handlers: look for functions in any prop
  for (const key of Object.keys(props)) {
    if (typeof props[key] === 'function' && (
      /click|publish|send|submit|confirm|post/i.test(key)
    )) {
      try { (props[key] as Function)(clickEvent); return key; } catch { /* */ }
    }
  }

  return null;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  // Set value via native setter so React's tracking picks it up
  desc?.set?.call(el, value);

  // Trigger the full React synthetic event pipeline
  // React listens for these at the root for its synthetic event system
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value, composed: true }));

  // Also try: React 17+ uses native input/change events tracked via
  // the fiber's updateQueue. But some Weibo components use controlled
  // inputs that need the value set on the fiber directly.
  const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
  if (fiberKey) {
    let fiber = (el as any)[fiberKey];
    for (let depth = 0; fiber && depth < 30; depth++) {
      const props = fiber.memoizedProps || fiber.pendingProps || {};
      if (typeof props.onChange === 'function') {
        try {
          props.onChange({ target: el, currentTarget: el, type: 'change' });
        } catch { /* */ }
      }
      if (typeof props.onInput === 'function') {
        try {
          props.onInput({ target: el, currentTarget: el, type: 'input' });
        } catch { /* */ }
      }
      fiber = fiber.return;
    }
  }
}

function hasPublishSuccessSignal(): boolean {
  return /发布成功|发送成功|已发布|微博已发布|分享成功/.test(
    compactText(document.body.innerText || ''),
  );
}

function selectAllContent(el: HTMLElement): boolean {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges(); sel?.addRange(range);
    return true;
  } catch { return false; }
}

function stripAllImageRefs(body: string): string {
  let result = body.replace(/<img[^>]*src\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');
  let searchFrom = 0; let safety = 0;
  while (safety < 500) {
    const start = result.indexOf('![', searchFrom);
    if (start === -1) break;
    const bracketEnd = result.indexOf('](', start);
    if (bracketEnd === -1) { searchFrom = start + 2; safety++; continue; }
    const urlStart = bracketEnd + 2;
    const parenEnd = result.indexOf(')', urlStart);
    if (parenEnd === -1) { searchFrom = start + 2; safety++; continue; }
    result = result.slice(0, start) + result.slice(parenEnd + 1);
    searchFrom = start; safety++;
  }
  return result;
}

/* ── DOM Utilities ── */

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
function describe(el: HTMLElement): string {
  return compactText(el.innerText || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || el.tagName).slice(0, 30);
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Diagnostics ── */

function dumpWeiboConfig() {
  try {
    const w = window as any;
    if (w.$CONFIG) {
      const c = w.$CONFIG;
      console.log('[WB-diag] $CONFIG:', {
        uid: c.uid, st: c.st ? `${c.st.slice(0, 8)}...` : undefined,
        crossid: c.crossid, islogin: c.islogin,
        scriptUrl: c.scriptUrl, version: c.version,
      });
    } else {
      console.log('[WB-diag] $CONFIG: not found');
    }
    // List potentially useful global objects
    const globals = Object.keys(w).filter((k) => /^\$/.test(k) || /wb/i.test(k) || /weibo/i.test(k));
    console.log('[WB-diag] 相关全局变量:', globals.slice(0, 30));
    console.log('[WB-diag] document.cookie keys:', document.cookie.split(';').map((s) => s.trim().split('=')[0]).slice(0, 20));
  } catch (e) { console.log('[WB-diag] err:', e); }
}

function dumpPageState() {
  console.log('[WB-diag] contenteditable:', Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"]')).filter((el) => el.getBoundingClientRect().width > 0).length);
  const fields = Array.from(document.querySelectorAll<HTMLElement>('input, textarea')).filter((el) => el.getBoundingClientRect().width > 0);
  console.log('[WB-diag] input/textarea:', fields.length);
  fields.slice(0, 10).forEach((el, i) => {
    const inp = el as HTMLInputElement;
    console.log(`  [${i}] ${el.tagName} ${(el.className && typeof el.className === 'string' ? el.className : '').slice(0, 60)} ${inp.placeholder || ''}`);
  });
}
function dumpAllTexts() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('*'))
    .filter(isVisible).filter((el) => !isDisabled(el))
    .map((el) => ({ text: compactText(el.innerText || el.textContent || ''), tag: el.tagName }))
    .filter(({ text }) => text.length >= 1 && text.length <= 20);
  console.log('[WB-diag] 短文本:', els.length);
  els.slice(0, 20).forEach(({ text, tag }) => console.log(`  - "${text}" <${tag}>`));
}
