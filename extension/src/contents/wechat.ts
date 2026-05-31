import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  run_at: 'document_idle',
};

const PLATFORM = 'wechat';
const NAME = '微信公众号';
const MAX_LOGIN_WAIT = 120000;
const WECHAT_EDITOR_JOB_KEY = 'contentbridge_wechat_editor';

type ImagePayload = {
  id: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
};

interface WxMeta {
  uid: string;
  nickName: string;
  token: string;
  ticket: string;
  svrTime: string;
}

async function readWxMeta(): Promise<WxMeta | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'READ_WX_META' }, (response) => {
      if (chrome.runtime.lastError || !response?.meta) {
        resolve(null);
      } else {
        resolve(response.meta as WxMeta);
      }
    });
  });
}

async function waitForMeta(): Promise<WxMeta | null> {
  const start = Date.now();
  let toastShown = false;

  while (Date.now() - start < MAX_LOGIN_WAIT) {
    const meta = await readWxMeta();
    if (meta) return meta;

    if (!toastShown) {
      showContentBridgeToast('⏳ 请先登录微信公众号后台，登录后自动继续…', 'info');
      toastShown = true;
    }

    await sleep(1500);
  }

  return null;
}

(async function init() {
  // ── Phase 1b: Image insertion on the draft editor page ──
  if (window.self === window.top) {
    const editorJob = await readEditorJob();
    if (editorJob) {
      await runEditorImageJob(editorJob);
      return;
    }
  }

  // ── Phase 1a: Draft creation from contentbridge_fill ──
  const data = await chrome.storage.local.get(`contentbridge_fill_${PLATFORM}`);
  const fill = data[`contentbridge_fill_${PLATFORM}`];
  if (!fill || fill.platform !== PLATFORM) return;

  if (window.self !== window.top) return;

  const { title, body } = fill.content as { title: string; body: string };

  try {
    showContentBridgeToast('🔄 正在检测登录状态…', 'info');

    const meta = await waitForMeta();
    if (!meta) return fail('等待登录超时（2分钟），请重新点击发布');

    await chrome.storage.local.remove(`contentbridge_fill_${PLATFORM}`);

    showContentBridgeToast('✅ 已登录，正在创建草稿…', 'success');

    const draftResult = await createDraft(meta, title, body);
    if (!draftResult) return fail('创建草稿失败，请检查公众号后台是否正常');

    const draftLink = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${draftResult.appMsgId}&token=${meta.token}&lang=zh_CN`;
    const images = await getPendingImages();
    const bodyImages = images.filter((img) => img.id !== 'cover');

    // Always go through editor for image insertion (toolbar upload is the only proven approach)
    await chrome.storage.local.set({
      [WECHAT_EDITOR_JOB_KEY]: {
        appMsgId: draftResult.appMsgId,
        draftLink,
        imageCount: bodyImages.length,
        timestamp: Date.now(),
      },
    });
    window.open(draftLink, '_blank');
    showContentBridgeToast(`草稿已创建${bodyImages.length > 0 ? `，即将上传 ${bodyImages.length} 张图片` : ''}…`, 'info');
  } catch (err) {
    await chrome.storage.local.remove(`contentbridge_fill_${PLATFORM}`);
    fail(err instanceof Error ? err.message : '公众号发布失败');
  }
})();

async function readEditorJob(): Promise<{ appMsgId: string; draftLink: string; imageCount: number; timestamp: number } | null> {
  const data = await chrome.storage.local.get(WECHAT_EDITOR_JOB_KEY);
  const job = data[WECHAT_EDITOR_JOB_KEY];
  if (!job) return null;
  if (Date.now() - Number(job.timestamp || 0) > 5 * 60 * 1000) {
    await chrome.storage.local.remove(WECHAT_EDITOR_JOB_KEY);
    return null;
  }
  const appMsgId = new URLSearchParams(location.search).get('appmsgid');
  if (job.appMsgId && appMsgId && String(job.appMsgId) !== appMsgId) return null;
  if (!/appmsg_edit/.test(location.href)) return null;
  return job;
}

async function runEditorImageJob(job: { imageCount: number }) {
  try {
    const images = (await getPendingImages()).filter((img) => img.id !== 'cover');
    if (images.length === 0) {
      await chrome.storage.local.remove(WECHAT_EDITOR_JOB_KEY);
      done('草稿已创建，请在编辑页确认内容后手动点击发表');
      return;
    }

    const beforeCount = countEditorImages();
    showContentBridgeToast(`📷 正在上传 ${images.length} 张图片…`, 'info');
    console.log('[WX-IMG] 开始工具栏上传, 当前图片数:', beforeCount);

    try {
      await uploadImagesThroughWechatToolbar(images);
    } catch (err) {
      console.log('[WX-IMG] 工具栏上传异常:', err);
    }

    await chrome.storage.local.remove(WECHAT_EDITOR_JOB_KEY);
    const afterCount = countEditorImages();
    const inserted = afterCount - beforeCount;
    console.log('[WX-IMG] 上传完成, 新增:', inserted);

    if (inserted > 0) {
      done(`草稿已创建，已插入 ${inserted} 张图片，请在编辑页确认后手动点击发表`);
    } else if (images.length > 0) {
      done(`草稿已创建，但图片上传失败（0/${images.length}），请在编辑页手动插入图片后点击发表`);
    } else {
      done('草稿已创建，请在编辑页确认后手动点击发表');
    }
  } catch (err) {
    await chrome.storage.local.remove(WECHAT_EDITOR_JOB_KEY);
    done('草稿已创建，请在编辑页确认内容后手动点击发表');
  }
}

async function getPendingImages(): Promise<ImagePayload[]> {
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES', payload: { platform: PLATFORM } });
    return (resp?.images || []) as ImagePayload[];
  } catch {
    return [];
  }
}

async function uploadImagesThroughWechatToolbar(images: ImagePayload[]): Promise<boolean> {
  console.log('[WX-IMG] 工具栏上传:', images.length, '张');

  const insertButton = await waitFor(findInsertImageButton, 30000);
  if (!insertButton) {
    console.log('[WX-IMG] 未找到图片按钮');
    throw new Error('未找到微信编辑器图片按钮');
  }

  console.log('[WX-IMG] 图片按钮:', describeEl(insertButton));

  // Enhanced click: native events + React fiber
  focusWechatEditor();
  forceClickWechat(insertButton);

  // Dynamic file input detection via MutationObserver
  const input = await waitForFileInput(5000);
  if (!input) {
    console.log('[WX-IMG] 未检测到 file input 创建');
    throw new Error('未找到微信本地上传图片 input[type=file]');
  }

  console.log('[WX-IMG] file input 已就绪');

  const before = countEditorImages();
  console.log('[WX-IMG] 当前图片数:', before);

  const files = images.map(dataUrlToFile);
  setInputFiles(input, files);

  // Dispatch events to trigger WeChat's upload handler
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  // Some versions need the event on the parent
  if (input.parentElement) {
    input.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
  }

  console.log('[WX-IMG] 等待图片出现...');
  const uploaded = await waitForEditorImageCount(before + images.length, 90000);
  const after = countEditorImages();
  console.log('[WX-IMG] 最终图片数:', after, '目标:', before + images.length);
  return uploaded || after > before;
}

/**
 * Wait for a file input to appear (created dynamically after clicking the image button).
 */
function waitForFileInput(timeout: number): Promise<HTMLInputElement | null> {
  return new Promise((resolve) => {
    // Check immediately
    const existing = findWechatLocalImageInput();
    if (existing) { resolve(existing); return; }

    const deadline = Date.now() + timeout;
    const observer = new MutationObserver(() => {
      const input = findWechatLocalImageInput();
      if (input) { observer.disconnect(); resolve(input); return; }
      if (Date.now() > deadline) { observer.disconnect(); resolve(null); }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also observe all iframe documents
    for (const frame of Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'))) {
      try {
        const doc = frame.contentDocument;
        if (doc) observer.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
      } catch { /* */ }
    }

    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

function findInsertImageButton(): HTMLElement | null {
  for (const doc of getReachableDocuments()) {
    const direct = doc.querySelector<HTMLElement>('#js_editor_insertimage');
    if (direct) return direct;
    const byText = Array.from(doc.querySelectorAll<HTMLElement>('li, button, [role="button"]'))
      .find((el) => (el.textContent || '').replace(/\s+/g, '').includes('图片'));
    if (byText) return byText;
  }
  return null;
}

function findWechatLocalImageInput(): HTMLInputElement | null {
  for (const doc of getReachableDocuments()) {
    const direct = doc.querySelector<HTMLInputElement>('#js_editor_insertimage input[type="file"]');
    if (direct) return direct;
    const byAccept = doc.querySelector<HTMLInputElement>('input[type="file"][accept*="image"]');
    if (byAccept) return byAccept;
  }
  return null;
}

function focusWechatEditor() {
  const docs = getReachableDocuments();
  for (const doc of docs) {
    const el = doc.querySelector<HTMLElement>(
      '#js_content, .rich_media_content, [contenteditable="true"], body',
    );
    if (el) {
      el.focus?.();
      el.click?.();
      return;
    }
  }
}

function countEditorImages(): number {
  return getReachableDocuments()
    .reduce((sum, doc) => sum + doc.querySelectorAll('img').length, 0);
}

function waitForEditorImageCount(target: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (countEditorImages() >= target) return resolve(true);
    const observers = getReachableDocuments().map((doc) => {
      const observer = new MutationObserver(() => {
        if (countEditorImages() >= target) {
          observers.forEach((item) => item.disconnect());
          resolve(true);
        }
      });
      observer.observe(doc.body || doc.documentElement, { childList: true, subtree: true, attributes: true });
      return observer;
    });
    setTimeout(() => {
      observers.forEach((item) => item.disconnect());
      resolve(countEditorImages() >= target);
    }, timeout);
  });
}

function getReachableDocuments(): Document[] {
  const docs = [document];
  for (const frame of Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'))) {
    try {
      const doc = frame.contentDocument;
      if (doc) docs.push(doc);
    } catch {
      // Cross-origin or sandboxed iframe.
    }
  }
  return docs;
}

function dataUrlToFile(img: ImagePayload): File {
  const [header, payload] = img.dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || img.mimeType || 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime.includes('jpeg') ? 'jpg' : mime.split('/')[1]?.replace('svg+xml', 'svg') || 'png';
  return new File([bytes], img.filename || `wechat-image.${ext}`, { type: mime });
}

const nativeFilesSetter = (() => {
  try {
    return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set || null;
  } catch {
    return null;
  }
})();

function setInputFiles(input: HTMLInputElement, files: File[]) {
  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  if (nativeFilesSetter) nativeFilesSetter.call(input, dt.files);
  else input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickEl(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
}

function waitFor<T extends HTMLElement>(finder: () => T | null, timeout: number): Promise<T | null> {
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

async function createDraft(
  meta: WxMeta,
  title: string,
  content: string,
): Promise<{ appMsgId: string } | null> {
  try {
    const params = new URLSearchParams();
    params.set('token', meta.token);
    params.set('lang', 'zh_CN');
    params.set('f', 'json');
    params.set('ajax', '1');
    params.set('random', String(Math.random()));
    params.set('AppMsgId', '');
    params.set('count', '1');
    params.set('data_seq', '0');
    params.set('operate_from', 'Chrome');
    params.set('isnew', '0');
    params.set('title0', title);
    params.set('content0', content);
    params.set('author0', '');
    params.set('writerid0', '0');
    params.set('fileid0', '');
    params.set('digest0', '');
    params.set('auto_gen_digest0', '1');
    params.set('sourceurl0', '');
    params.set('need_open_comment0', '1');
    params.set('only_fans_can_comment0', '0');
    params.set('cdn_url0', '');
    params.set('cdn_235_1_url0', '');
    params.set('cdn_1_1_url0', '');
    params.set('cdn_url_back0', '');
    params.set('crop_list0', '');
    params.set('music_id0', '');
    params.set('video_id0', '');
    params.set('voteid0', '');
    params.set('voteismlt0', '');
    params.set('supervoteid0', '');
    params.set('cardid0', '');
    params.set('cardquantity0', '');
    params.set('cardlimit0', '');
    params.set('vid_type0', '');
    params.set('show_cover_pic0', '0');
    params.set('shortvideofileid0', '');
    params.set('copyright_type0', '0');
    params.set('releasefirst0', '');
    params.set('platform0', '');
    params.set('reprint_permit_type0', '');
    params.set('allow_reprint0', '');
    params.set('allow_reprint_modify0', '');
    params.set('original_article_type0', '');
    params.set('ori_white_list0', '');
    params.set('free_content0', '');
    params.set('fee0', '0');
    params.set('ad_id0', '');
    params.set('guide_words0', '');
    params.set('is_share_copyright0', '0');
    params.set('share_copyright_url0', '');
    params.set('source_article_type0', '');
    params.set('reprint_recommend_title0', '');
    params.set('reprint_recommend_content0', '');
    params.set('share_page_type0', '0');
    params.set('share_imageinfo0', '{"list":[]}');
    params.set('share_video_id0', '');
    params.set('dot0', '{}');
    params.set('share_voice_id0', '');
    params.set('insert_ad_mode0', '');
    params.set('categories_list0', '[]');
    params.set('can_reward0', '0');
    params.set('ad_video_transition0', '');
    params.set('related_video0', '');
    params.set('is_video_recommend0', '-1');

    const resp = await fetch(
      `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=create&type=77&token=${meta.token}&lang=zh_CN`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
    );

    const result = await resp.json();
    console.log('[MultiPublish] createDraft response:', result);

    if (result.appMsgId) {
      return { appMsgId: String(result.appMsgId) };
    }

    const errMsg = formatWxError(result);
    console.error('[MultiPublish] createDraft error:', errMsg, result);
    return null;
  } catch (err) {
    console.error('[MultiPublish] createDraft failed:', err);
    return null;
  }
}

function formatWxError(e: Record<string, unknown>): string {
  let ret = 0;
  if (typeof e.ret === 'number') ret = e.ret;
  else if (e.base_resp && typeof (e.base_resp as Record<string, unknown>).ret === 'number')
    ret = (e.base_resp as Record<string, unknown>).ret as number;

  const errorMap: Record<number, string> = {
    [-8]: '请输入验证码',
    [-6]: '请输入验证码',
    62752: '可能含有安全风险链接',
    64504: '保存图文消息错误',
    412: '图文中含非法外链',
    64702: '标题超出64字限制',
    64703: '摘要超出120字限制',
    320001: '素材已被删除',
  };

  return errorMap[ret] || (e.errmsg as string) || `错误(ret=${ret})`;
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Robust Click ── */

function forceClickWechat(el: HTMLElement) {
  el.scrollIntoView({ block: 'center' });
  el.focus();

  dispatchNativeClickSequence(el);

  // React fiber fallback — WeChat uses React
  const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
  if (fiberKey) {
    let fiber = (el as any)[fiberKey];
    for (let depth = 0; fiber && depth < 30; depth++) {
      const props = fiber.memoizedProps || fiber.pendingProps || {};
      for (const name of ['onClick', 'onMouseDown', 'onPointerDown', 'onTap']) {
        if (typeof props[name] === 'function') {
          try { props[name](new MouseEvent('click', { bubbles: true, cancelable: true })); } catch { /* */ }
        }
      }
      if (fiber.stateNode?.props) {
        for (const name of ['onClick', 'onMouseDown']) {
          if (typeof fiber.stateNode.props[name] === 'function') {
            try { fiber.stateNode.props[name](new MouseEvent('click', { bubbles: true })); } catch { /* */ }
          }
        }
      }
      fiber = fiber.return;
    }
  }

  const form = el.closest('form');
  if (form) {
    try { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } catch { /* */ }
  }
}

function dispatchNativeClickSequence(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/* ── DOM Utilities ── */

function isVisibleWx(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
}
function isDisabledWx(el: HTMLElement): boolean {
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || /\bdisabled\b/.test(el.className || '');
}
function compactTextWx(value: string): string {
  return value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
function describeEl(el: HTMLElement): string {
  return compactTextWx(el.innerText || el.textContent || el.getAttribute('title') || el.tagName).slice(0, 30);
}
