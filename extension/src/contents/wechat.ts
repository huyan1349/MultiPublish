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

async function report(success: boolean, message: string) {
  await chrome.storage.local.set({
    contentbridge_result: { platform: PLATFORM, platformName: NAME, success, message, error: success ? undefined : message },
  });
  showContentBridgeToast(message, success ? 'success' : 'error');
}

(async function init() {
  const data = await chrome.storage.local.get('contentbridge_fill');
  const fill = data.contentbridge_fill;
  if (!fill || fill.platform !== PLATFORM) return;

  const { title, body, tags } = fill.content as { title: string; body: string; tags?: string[] };
  const autoLayout = !!fill.autoLayout;
  const isMain = window.self === window.top;

  if (!isMain) {
    const ok = await fillBodyInIframe(body);
    if (ok) {
      await chrome.storage.local.set({ [FILL_FLAG_KEY]: true });
    }
    return;
  }

  try {
    if (!await checkLogin()) {
      await chrome.storage.local.remove('contentbridge_fill');
      await report(false, '未检测到公众号登录状态，请先登录 mp.weixin.qq.com');
      return;
    }

    const processedBody = await processImages(body);

    const filled = await tryFillMain(title, processedBody, tags || []);
    if (!filled.success) {
      await chrome.storage.local.remove('contentbridge_fill');
      await chrome.storage.local.remove(FILL_FLAG_KEY);
      await report(false, filled.error || '填充失败');
      return;
    }

    if (!autoLayout) {
      await chrome.storage.local.remove('contentbridge_fill');
      await chrome.storage.local.remove(FILL_FLAG_KEY);
      await report(true, '公众号内容已填充，请手动操作发布');
      return;
    }

    showContentBridgeToast('✅ 内容已填充，开始自动发布流程...', 'success');
    const published = await tryAutoPublish();
    await chrome.storage.local.remove('contentbridge_fill');
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    await report(published.success, published.message);
  } catch (err) {
    await chrome.storage.local.remove('contentbridge_fill');
    await chrome.storage.local.remove(FILL_FLAG_KEY);
    const msg = err instanceof Error ? err.message : '公众号自动发布失败';
    await report(false, msg);
  }
})();

async function fillBodyInIframe(body: string): Promise<boolean> {
  const ed = await waitFor<HTMLElement>('[contenteditable="true"]', FILL_TIMEOUT);
  if (!ed) return false;

  ed.focus();
  await sleep(200);

  const pasteOk = pasteHtml(ed, body);
  if (pasteOk) {
    await sleep(500);
    if (hasContent(ed)) return true;
  }

  ed.innerHTML = body;
  ed.dispatchEvent(new Event('input', { bubbles: true }));
  ed.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
  return hasContent(ed);
}

async function tryFillMain(title: string, body: string, _tags: string[]): Promise<{ success: boolean; error?: string }> {
  const titleEl = await waitFor<HTMLTextAreaElement>('#title', FILL_TIMEOUT);
  if (!titleEl) return { success: false, error: '未找到标题输入框' };

  const titleOk = fillAndVerifyTitle(titleEl, title, 5000);
  if (!titleOk) return { success: false, error: '标题填充失败' };

  const iframe = document.querySelector('#ueditor_0') as HTMLIFrameElement | null;
  if (iframe?.contentDocument) {
    const ed = iframe.contentDocument.querySelector<HTMLElement>('[contenteditable="true"]');
    if (ed) {
      ed.focus();
      const pasteOk = pasteHtml(ed, body);
      if (pasteOk) {
        await sleep(500);
        if (hasContent(ed)) return { success: true };
      }

      ed.innerHTML = body;
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      ed.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(500);
      if (hasContent(ed)) return { success: true };
    }
  }

  await chrome.storage.local.remove(FILL_FLAG_KEY);
  const iframeFilled = await waitForStorageFlag(FILL_FLAG_KEY, FILL_TIMEOUT);
  if (!iframeFilled && !titleEl) {
    return { success: false, error: '未找到公众号编辑器' };
  }

  return { success: !!titleEl };
}

function fillAndVerifyTitle(el: HTMLTextAreaElement, text: string, timeout: number): boolean {
  const deadline = Date.now() + timeout;
  let ok = tryFillTitle(el, text);
  while (!ok && Date.now() < deadline) {
    ok = tryFillTitle(el, text);
  }
  return ok;
}

function tryFillTitle(el: HTMLTextAreaElement, text: string): boolean {
  el.focus();
  setNativeValue(el, text);
  return (el.value || '').trim().length > 0;
}

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(2000);

  const publishBtn = await waitForElement(findPublishButton, PUBLISH_TIMEOUT);
  if (!publishBtn) return { success: false, message: '未找到公众号发布按钮' };

  clickElement(publishBtn);
  await sleep(2000);

  for (let i = 0; i < 5; i++) {
    if (hasPublishSuccessSignal()) {
      return { success: true, message: '公众号内容已自动提交发布' };
    }

    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      clickElement(confirmBtn);
      await sleep(2000);
      continue;
    }

    await sleep(1500);
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: '公众号内容已自动提交发布' }
    : { success: true, message: '已自动点击公众号发布流程，请在页面确认最终状态' };
}

async function processImages(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const images = doc.querySelectorAll<HTMLImageElement>('img');
  if (images.length === 0) return html;

  const token = extractToken();
  if (!token) return html;

  for (const img of Array.from(images)) {
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (!src || src.includes('mmbiz.qpic.cn') || src.startsWith('data:')) continue;

    try {
      const wechatUrl = await uploadImageToWechat(src, token);
      if (wechatUrl) {
        img.setAttribute('src', wechatUrl);
        img.removeAttribute('data-src');
      }
    } catch {
      console.warn('[ContentBridge:Wechat] 图片上传失败:', src);
    }
  }

  return doc.body.innerHTML;
}

function extractToken(): string | null {
  const urlMatch = location.href.match(/token=(\d+)/);
  if (urlMatch) return urlMatch[1];

  const metaToken = document.querySelector<HTMLMetaElement>('meta[name="csrf_token"]');
  if (metaToken?.content) return metaToken.content;

  try {
    const scripts = document.querySelectorAll('script:not([src])');
    for (const s of scripts) {
      const m = s.textContent?.match(/token\s*[:=]\s*['"]?(\d+)/);
      if (m) return m[1];
    }
  } catch { /* ignore */ }

  return null;
}

async function uploadImageToWechat(imageUrl: string, token: string): Promise<string | null> {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();

    const ext = blob.type.split('/')[1] || 'png';
    const filename = `image_${Date.now()}.${ext}`;
    const file = new File([blob], filename, { type: blob.type || 'image/png' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'upload_image');
    formData.append('scene', '1');

    const uploadResp = await fetch(`/cgi-bin/filetransfer?token=${token}`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResp.ok) return null;
    const result = await uploadResp.json();
    return result?.content || result?.url || null;
  } catch {
    return null;
  }
}

function pasteHtml(el: HTMLElement, html: string): boolean {
  try {
    el.focus();
    el.click();
    const dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', htmlToText(html));
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    return true;
  } catch {
    return false;
  }
}

function hasContent(el: HTMLElement): boolean {
  return (el.textContent || '').trim().length > 10;
}

function findPublishButton(): HTMLElement | null {
  return findButtonByText(['发表', '发布', '群发', '群发消息', '提交发布']);
}

function findConfirmButton(): HTMLElement | null {
  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .weui-desktop-dialog, .weui-desktop-popover, .dialog, .modal, [class*="publish"], [class*="confirm"]',
  )).filter(isVisible);

  for (const root of dialogRoots) {
    const btn = findButtonByText(['确认', '确定', '确认发布', '继续发布', '发表', '群发'], root);
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
  if (/发布成功|已发布|发送成功|群发成功|操作成功|提交成功/.test(text)) return true;
  if (!/\/cgi-bin\/appmsg/.test(location.href)) return true;
  return false;
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

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
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

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
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
