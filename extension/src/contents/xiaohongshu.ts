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
const PUBLISH_TIMEOUT = 30000;

const LOGIN_INDICATORS = [
  '.sidebar-user-info',
  '[class*="avatar"]',
  '[class*="user-info"]',
  '[class*="nickname"]',
  '[class*="creator-sidebar"]',
];

(async function init() {
  const data = await chrome.storage.local.get(`contentbridge_fill_${PLATFORM}`);
  const fill = data[`contentbridge_fill_${PLATFORM}`];
  if (!fill || fill.platform !== PLATFORM) return;

  try {
    if (!await checkLogin()) {
      await report(false, '未检测到小红书登录状态，请先登录后再发布');
      return;
    }

    await chrome.storage.local.remove(`contentbridge_fill_${PLATFORM}`);

    const { title, body, tags } = fill.content as { title: string; body: string; tags: string[] };
    const plainText = htmlToPlainText(body);
    const autoLayout = !!fill.autoLayout;

    if (!await navigateToLongArticleEditor()) {
      await report(false, '未能进入小红书长文编辑页面，请检查是否有"写长文"权限');
      return;
    }

    const fillResult = await tryFillLongArticle(title, plainText, tags);
    if (!fillResult.success) {
      await report(false, fillResult.error || '小红书填充失败');
      return;
    }

    // ── 获取图片并分类 ──
    let coverImages: { id: string; dataUrl: string; filename: string; mimeType: string }[] = [];
    let bodyImages: { id: string; dataUrl: string; filename: string; mimeType: string }[] = [];
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES', payload: { platform: PLATFORM } });
      const allImages = (resp?.images || []) as { id: string; dataUrl: string; filename: string; mimeType: string }[];
      console.log('[XHS-IMG] images:', allImages.length);
      coverImages = allImages.filter(img => img.id === 'cover');
      bodyImages = allImages.filter(img => img.id !== 'cover');
    } catch (e) { console.log('[XHS-IMG] GET_IMAGES err:', e); }

    // ── 上传正文图片（在封面前，避免封面操作干扰编辑器）──
    if (bodyImages.length > 0) {
      const bodyEl = findBodyEditor();
      if (bodyEl) {
        bodyEl.focus();
        bodyEl.click();
        await sleep(300);
        for (const img of bodyImages) {
          console.log('[XHS-IMG-BODY] uploading:', img.id);
          const ok = await _xhsUploadBodyImage(img);
          console.log('[XHS-IMG-BODY]', img.id, ok ? 'OK' : 'FAIL');
          if (ok) await sleep(2000);
        }
      }
    }

    // ── 上传封面图 ──
    for (const img of coverImages) {
      const ok = await _xhsUploadCover(img);
      console.log('[XHS-IMG-COVER]', img.id, ok ? 'OK' : 'FAIL');
      if (ok) await sleep(2000);
    }

    // ── 封面上传后验证正文完整性 ──
    {
      const bodyEl = findBodyEditor();
      if (bodyEl) {
        const bodyText = compactText(bodyEl.innerText || bodyEl.textContent || '');
        if (bodyText.length < 10) {
          console.log('[XHS] body lost after cover upload, refilling...');
          showContentBridgeToast('⚠️ 正文被覆盖，正在重新填充...', 'info');
          bodyEl.focus();
          bodyEl.click();
          await sleep(500);
          const refillOk = await fillContentEditable(bodyEl, plainText.substring(0, 5000));
          console.log('[XHS] body refill after cover upload:', refillOk);
          if (refillOk && tags.length > 0) {
            await appendTagsToBody(bodyEl, tags);
          }
        }
      }
    }

    if (!autoLayout) {
      showContentBridgeToast('✅ 内容已填充完成，请手动操作', 'success');
      await report(true, '小红书内容已填充，请手动排版和发布');
      return;
    }

    showContentBridgeToast('✅ 内容已填充，开始自动排版发布流程...', 'success');

    const layoutOk = await clickAutoLayout();
    if (!layoutOk) {
      await report(false, '未找到"一键排版"按钮，请手动点击');
      return;
    }

    await sleep(1500);

    const bodyEl2 = await waitForElement(findBodyEditor, FILL_TIMEOUT);
    if (bodyEl2) {
      const currentText = compactText(bodyEl2.innerText || bodyEl2.textContent || '');
      if (currentText.length < 10) {
        bodyEl2.focus();
        bodyEl2.click();
        await sleep(500);

        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(bodyEl2);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        await sleep(200);

        let refillOk = await fillContentEditable(bodyEl2, plainText.substring(0, 5000));
        console.log('[XHS] refill attempt 1:', refillOk);

        if (!refillOk) {
          await sleep(1000);
          bodyEl2.focus();
          bodyEl2.click();
          await sleep(500);
          refillOk = await fillContentEditable(bodyEl2, plainText.substring(0, 5000));
          console.log('[XHS] refill attempt 2:', refillOk);
        }

        if (!refillOk) {
          await report(false, '一键排版后正文重填失败，请手动输入正文');
          return;
        }
      }
      if (tags.length > 0) await appendTagsToBody(bodyEl2, tags);
    }

    const bodyCheck = findBodyEditor();
    if (bodyCheck) {
      const bodyText = compactText(bodyCheck.innerText || bodyCheck.textContent || '');
      if (bodyText.length < 5) {
        await report(false, '正文内容为空，无法继续发布');
        return;
      }
    }

    const nextOk = await clickNextStep();
    if (!nextOk) {
      await report(false, '未找到"下一步"按钮，请手动点击');
      return;
    }
    await sleep(4000);

    const publishOk = await clickPublish();
    if (!publishOk) {
      await report(true, '已进入发布页面，请手动点击发布按钮');
      return;
    }

    await report(true, '小红书笔记已自动提交发布');
  } catch (err) {
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
  await sleep(1500);
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
      await sleep(1000);
      if (await isLongArticleEditorReady()) return true;
    }
  }

  if (!/\/publish/.test(location.pathname)) {
    const publishBtn = await findElementByText('发布笔记', NAV_TIMEOUT);
    if (publishBtn) {
      clickElement(publishBtn);
      await sleep(1000);
    } else {
      window.location.href = 'https://creator.xiaohongshu.com/publish/publish';
      await sleep(1500);
    }

    const clicked = await clickByText('写长文', NAV_TIMEOUT);
    if (clicked) {
      await sleep(1000);
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
    await sleep(1000);
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
   自动排版发布流程
   ═══════════════════════════════════════════ */

async function clickAutoLayout(): Promise<boolean> {
  const btn = await findElementByText('一键排版', NAV_TIMEOUT);
  if (!btn) return false;
  clickElement(btn);
  await sleep(1500);
  return true;
}

async function clickNextStep(): Promise<boolean> {
  const btn = await findElementByText('下一步', NAV_TIMEOUT);
  if (!btn && findPublishButtonNow()) return true;
  if (!btn) return false;
  clickElement(btn);
  await sleep(1500);
  return true;
}

async function clickPublish(): Promise<boolean> {
  await sleep(1500);

  const btn = await findPublishButton(PUBLISH_TIMEOUT);
  const clicked = btn ? forceClickElement(btn) : await clickPublishViaMainWorld();
  if (!clicked && !clickPublishViaPosition()) return false;

  await sleep(1500);

  for (let i = 0; i < 4; i++) {
    if (hasPublishSuccessSignal()) return true;
    const confirmBtn = findConfirmButton();
    if (confirmBtn) {
      forceClickElement(confirmBtn);
      await sleep(1000);
    } else {
      await sleep(800);
    }
  }

  return hasPublishSuccessSignal();
}

async function clickPublishViaMainWorld(): Promise<boolean> {
  document.documentElement.removeAttribute('data-xhs-publish-result');
  document.documentElement.setAttribute('data-xhs-click-publish', '1');

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = document.documentElement.getAttribute('data-xhs-publish-result');
    if (result) {
      document.documentElement.removeAttribute('data-xhs-publish-result');
      return result === 'clicked';
    }
    await sleep(120);
  }

  document.documentElement.removeAttribute('data-xhs-click-publish');
  return false;
}

async function findPublishButton(timeout: number): Promise<HTMLElement | null> {
  return waitForElement(() => {
    const bottomBarBtn = findPublishButtonNow();
    if (bottomBarBtn) return bottomBarBtn;

    const allBtns = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a, div, span'))
      .filter(isVisible)
      .filter((el) => !isDisabled(el));

    const exactMatches = allBtns
      .filter((el) => {
        const text = compactText(el.textContent || '');
        return (text === '发布' || text === '立即发布') && text.length <= 8;
      })
      .map((el) => ({ el: closestClickable(el), score: scorePublishButton(el) }))
      .filter(({ el }) => el && isVisible(el) && !isDisabled(el));

    if (exactMatches.length > 0) {
      exactMatches.sort((a, b) => b.score - a.score);
      return exactMatches[0]?.el || null;
    }

    return null;
  }, timeout);
}

function findPublishButtonNow(): HTMLElement | null {
  return findBottomPublishButton() || findRedBottomPublishButton();
}

function clickPublishViaPosition(): boolean {
  const bottomPublish = findPublishButtonNow();
  if (bottomPublish) return forceClickElement(bottomPublish);

  const bottomPositions = buildBottomPublishProbePoints();

  for (const pos of bottomPositions) {
    const target = getPublishCandidateFromPoint(pos.x, pos.y);
    if (target) return forceClickElement(target);
  }

  const customEls = Array.from(document.querySelectorAll('*'))
    .filter((el) => el.tagName.includes('-'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > window.innerWidth * 0.5 && r.bottom > window.innerHeight * 0.6;
    });

  if (customEls.length > 0) {
    customEls.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (rb.bottom + rb.right) - (ra.bottom + ra.right);
    });
    for (const target of customEls) {
      const rect = target.getBoundingClientRect();
      const candidate = getPublishCandidateFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (candidate) return forceClickElement(candidate);
    }
  }

  return false;
}

function findBottomPublishButton(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a, div, span'))
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .filter((el) => /^(发布|立即发布)$/.test(compactText(el.innerText || el.textContent || '')))
    .map((el) => closestClickable(el))
    .filter((el, index, arr) => arr.indexOf(el) === index)
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.bottom > window.innerHeight * 0.70)
    .filter(({ rect }) => rect.left > window.innerWidth * 0.15 && rect.right < window.innerWidth * 0.85);

  candidates.sort((a, b) => {
    const aCenter = Math.abs((a.rect.left + a.rect.right) / 2 - window.innerWidth / 2);
    const bCenter = Math.abs((b.rect.left + b.rect.right) / 2 - window.innerWidth / 2);
    return b.rect.bottom - a.rect.bottom || aCenter - bCenter;
  });

  return candidates[0]?.el || null;
}

function findRedBottomPublishButton(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a, div, span'))
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .map((el) => closestClickable(el))
    .filter((el, index, arr) => arr.indexOf(el) === index)
    .map((el) => ({ el, rect: el.getBoundingClientRect(), score: scorePublishButton(el) }))
    .filter(({ el, rect }) => {
      const text = compactText(el.innerText || el.textContent || '');
      return (
        rect.bottom > window.innerHeight * 0.72
        && rect.left > window.innerWidth * 0.20
        && rect.right < window.innerWidth * 0.78
        && rect.width >= 72
        && rect.width <= 180
        && rect.height >= 28
        && rect.height <= 64
        && (isRedButton(el) || text === '发布' || text === '立即发布')
      );
    });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.el || null;
}

function buildBottomPublishProbePoints(): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const xs = [0.50, 0.52, 0.48, 0.45, 0.55, 0.42, 0.58];
  const ys = [45, 55, 65, 35];
  for (const yOffset of ys) {
    for (const xRatio of xs) {
      points.push({ x: window.innerWidth * xRatio, y: window.innerHeight - yOffset });
    }
  }
  return points;
}

function getPublishCandidateFromPoint(x: number, y: number): HTMLElement | null {
  const target = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!target || target === document.body || target === document.documentElement) return null;

  const clickable = closestClickable(target);
  if (!isVisible(clickable) || isDisabled(clickable)) return null;

  const text = compactText(clickable.innerText || clickable.textContent || '');
  const rect = clickable.getBoundingClientRect();
  const inBottomActionArea = rect.bottom > window.innerHeight * 0.70 && rect.left > window.innerWidth * 0.15;
  if (!inBottomActionArea) return null;

  if (/^(发布|立即发布)$/.test(text) || isRedButton(clickable)) return clickable;
  return null;
}

function closestClickable(el: HTMLElement): HTMLElement {
  return el.closest<HTMLElement>('button, [role="button"], a, xhs-publish-btn, [class*="btn"], [class*="button"]') || el;
}

function scorePublishButton(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  let score = 0;
  if (rect.right > window.innerWidth * 0.55) score += 8;
  if (rect.bottom > window.innerHeight * 0.45) score += 5;
  if (isRedButton(el)) score += 10;
  if (/publish|submit|button|btn/i.test(el.className || '')) score += 4;
  if (el.tagName === 'BUTTON') score += 3;
  score += Math.min(rect.width, 180) / 180;
  return score;
}

function isRedButton(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const bg = parseRgb(style.backgroundColor);
  if (bg && bg.r >= 210 && bg.g <= 100 && bg.b <= 120 && bg.a > 0.4) return true;

  const child = Array.from(el.children)
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .find((node) => {
      const childBg = parseRgb(window.getComputedStyle(node).backgroundColor);
      return !!childBg && childBg.r >= 210 && childBg.g <= 100 && childBg.b <= 120 && childBg.a > 0.4;
    });
  return !!child;
}

function parseRgb(value: string): { r: number; g: number; b: number; a: number } | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function forceClickElement(el: HTMLElement): boolean {
  const target = closestClickable(el);
  target.scrollIntoView({ block: 'center', inline: 'center' });
  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y };
  target.dispatchEvent(new PointerEvent('pointerover', opts));
  target.dispatchEvent(new PointerEvent('pointerdown', opts));
  target.dispatchEvent(new MouseEvent('mousedown', opts));
  target.dispatchEvent(new PointerEvent('pointerup', opts));
  target.dispatchEvent(new MouseEvent('mouseup', opts));
  target.dispatchEvent(new MouseEvent('click', opts));
  target.click();
  return true;
}

function findConfirmButton(): HTMLElement | null {
  const dialogRoots = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], .modal, .dialog, [class*="modal"], [class*="dialog"]',
  )).filter(isVisible);

  for (const root of dialogRoots) {
    const btn = findButtonByText(['确认', '确定', '确认发布', '发布'], root);
    if (btn) return btn;
  }

  return null;
}

function hasPublishSuccessSignal(): boolean {
  const text = compactText(document.body.innerText || '');
  return /发布成功|笔记已发布|已发布|提交成功|审核中/.test(text);
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
  editor.click();
  await sleep(300);

  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  await sleep(100);

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

function findButtonByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], a, span, div'));
  const candidates = elements
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .map((el) => ({ el, text: compactText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => text && labels.some((label) => text === label || text.includes(label)));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.text.length - b.text.length);
  return candidates[0]?.el || null;
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

function isDisabled(el: HTMLElement): boolean {
  return (
    el.hasAttribute('disabled')
    || el.getAttribute('aria-disabled') === 'true'
    || /\bdisabled\b/.test(el.className || '')
  );
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

/* ── 图片上传 ── */

function _xhsDataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'image/png';
  let payload = parts.slice(1).join(','); // handle commas in base64
  const isBase64 = parts[0].includes('base64');
  if (isBase64) {
    try { payload = atob(payload); } catch {
      payload = atob(decodeURIComponent(payload));
    }
  }
  const bytes = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i++) bytes[i] = payload.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const _xhsNativeFS = (() => {
  try { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files'); return d?.set || null; }
  catch { return null; }
})();

function _xhsSetInputFiles(input: HTMLInputElement, file: File): void {
  const dt = new DataTransfer();
  dt.items.add(file);
  if (_xhsNativeFS) _xhsNativeFS.call(input, dt.files);
  else input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function _xhsUploadCover(img: { dataUrl: string; filename: string; mimeType: string }): Promise<boolean> {
  const blob = _xhsDataUrlToBlob(img.dataUrl);
  const file = new File([blob], img.filename || 'img.png', { type: img.mimeType || 'image/png' });

  const editorContainer = document.querySelector('.editor-container, .tiptap-container, .ProseMirror');

  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  console.log('[XHS-IMG] file inputs:', inputs.length);

  const coverInputs = inputs.filter(inp => {
    if (editorContainer && editorContainer.contains(inp)) {
      console.log('[XHS-IMG] skip body editor file input:', inp);
      return false;
    }
    return true;
  });

  if (coverInputs.length === 0 && inputs.length > 0) {
    console.log('[XHS-IMG] all inputs inside editor, trying first non-ProseMirror input');
    const nonProseInputs = inputs.filter(inp => !inp.closest('.ProseMirror'));
    if (nonProseInputs.length > 0) coverInputs.push(...nonProseInputs);
  }

  console.log('[XHS-IMG] cover-target inputs:', coverInputs.length);
  for (const inp of coverInputs) {
    _xhsSetInputFiles(inp, file);
    await sleep(2000);
  }

  const customs = Array.from(document.querySelectorAll('*')).filter(el => el.tagName.includes('-'));
  for (const el of customs) {
    const shadowInputs = _xhsShadowQueryAll(el, 'input[type="file"]');
    for (const inp of shadowInputs) {
      if (editorContainer && editorContainer.contains(inp)) {
        console.log('[XHS-IMG] skip shadow body editor file input');
        continue;
      }
      _xhsSetInputFiles(inp as HTMLInputElement, file);
      await sleep(2000);
    }
  }

  return coverInputs.length > 0;
}

async function _xhsUploadBodyImage(img: { dataUrl: string; filename: string; mimeType: string }): Promise<boolean> {
  const blob = _xhsDataUrlToBlob(img.dataUrl);
  const file = new File([blob], img.filename || 'img.png', { type: img.mimeType || 'image/png' });

  const bodyEl = findBodyEditor();
  if (!bodyEl) { console.log('[XHS-IMG-BODY] no editor'); return false; }

  bodyEl.focus();
  bodyEl.click();
  await sleep(300);

  const before = bodyEl.querySelectorAll('img').length;

  // Strategy 1: 编辑器容器内的 file input
  const editorContainer = bodyEl.closest('.editor-container, .tiptap-container, [class*="editor"]') || bodyEl.parentElement;
  if (editorContainer) {
    const editorInputs = editorContainer.querySelectorAll<HTMLInputElement>('input[type="file"]');
    console.log('[XHS-IMG-BODY] S1: editor file inputs:', editorInputs.length);
    for (const inp of editorInputs) {
      _xhsSetInputFiles(inp, file);
      const ok = await _xhsWaitForImageInEditor(bodyEl, before, 4000);
      if (ok) { console.log('[XHS-IMG-BODY] S1 success'); return true; }
    }

    const allElements = editorContainer.querySelectorAll('*');
    for (const el of allElements) {
      const sr = (el as any).shadowRoot;
      if (sr) {
        const shadowInputs = sr.querySelectorAll<HTMLInputElement>('input[type="file"]');
        for (const inp of shadowInputs) {
          _xhsSetInputFiles(inp, file);
          const ok = await _xhsWaitForImageInEditor(bodyEl, before, 4000);
          if (ok) { console.log('[XHS-IMG-BODY] S1 shadow success'); return true; }
        }
      }
    }
  }

  // Strategy 2: 页面上所有 accept 含 image 的 file input
  const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const imageInputs = allInputs.filter(i => (i.getAttribute('accept') || '').toLowerCase().includes('image'));
  console.log('[XHS-IMG-BODY] S2: image inputs:', imageInputs.length);
  for (const inp of imageInputs) {
    bodyEl.focus();
    await sleep(200);
    _xhsSetInputFiles(inp, file);
    const ok = await _xhsWaitForImageInEditor(bodyEl, before, 4000);
    if (ok) { console.log('[XHS-IMG-BODY] S2 success'); return true; }
  }

  // Strategy 3: ClipboardEvent 粘贴图片
  console.log('[XHS-IMG-BODY] S3: paste approach');
  try {
    bodyEl.focus();
    await sleep(200);
    const dt = new DataTransfer();
    dt.items.add(file);
    bodyEl.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: dt,
    }));
    const ok = await _xhsWaitForImageInEditor(bodyEl, before, 5000);
    if (ok) { console.log('[XHS-IMG-BODY] S3 success'); return true; }
  } catch (e) { console.log('[XHS-IMG-BODY] S3 error:', e); }

  // Strategy 4: 点击工具栏图片按钮 + 捕获 file input
  console.log('[XHS-IMG-BODY] S4: toolbar approach');
  const capturedInput = await _xhsClickToolbarCaptureInput();
  if (capturedInput) {
    bodyEl.focus();
    await sleep(200);
    _xhsSetInputFiles(capturedInput, file);
    const ok = await _xhsWaitForImageInEditor(bodyEl, before, 8000);
    if (ok) { console.log('[XHS-IMG-BODY] S4 success'); return true; }
  }

  console.log('[XHS-IMG-BODY] all strategies failed');
  return false;
}

async function _xhsClickToolbarCaptureInput(): Promise<HTMLInputElement | null> {
  let capturedInput: HTMLInputElement | null = null;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLInputElement && node.type === 'file') {
          capturedInput = node;
          observer.disconnect();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const origClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
    if (this.type === 'file') { capturedInput = this; return; }
    return origClick.call(this);
  };

  try {
    const toolbarBtns = Array.from(document.querySelectorAll<HTMLElement>(
      '[class*="toolbar"] button, [class*="Toolbar"] button, [class*="toolbar"] [role="button"]'
    )).filter(btn => {
      const t = (btn.getAttribute('title') || btn.textContent || '').toLowerCase();
      return t.includes('图片') || t.includes('image') || t.includes('img');
    });
    for (const btn of toolbarBtns) {
      forceClickElement(btn);
      await sleep(800);
      if (capturedInput) break;
    }

    if (!capturedInput) {
      const pmToolbar = document.querySelector('.ProseMirror-toolbar, .tiptap-toolbar, [class*="toolbar"]');
      if (pmToolbar) {
        const btns = pmToolbar.querySelectorAll<HTMLElement>('button, [role="button"]');
        for (const btn of btns) {
          const title = (btn.getAttribute('title') || btn.textContent || '').toLowerCase();
          if (title.includes('图片') || title.includes('image') || title.includes('img')) {
            forceClickElement(btn);
            await sleep(800);
            if (capturedInput) break;
          }
        }
      }
    }
  } finally {
    HTMLInputElement.prototype.click = origClick;
    observer.disconnect();
  }
  return capturedInput;
}

function _xhsWaitForImageInEditor(ed: HTMLElement, beforeCount: number, timeout: number): Promise<boolean> {
  return new Promise(resolve => {
    if (ed.querySelectorAll('img').length > beforeCount) { resolve(true); return; }
    const obs = new MutationObserver(() => {
      if (ed.querySelectorAll('img').length > beforeCount) { obs.disconnect(); resolve(true); }
    });
    obs.observe(ed, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(ed.querySelectorAll('img').length > beforeCount); }, timeout);
  });
}

function _xhsShadowQueryAll(root: Element, selector: string): HTMLElement[] {
  const results: HTMLElement[] = [];
  const sr = (root as any).shadowRoot || (root as any).__shadowRoot__;
  if (sr) {
    sr.querySelectorAll(selector).forEach((e: Element) => results.push(e as HTMLElement));
    for (const child of sr.children) results.push(..._xhsShadowQueryAll(child, selector));
  }
  for (const child of root.children) results.push(..._xhsShadowQueryAll(child, selector));
  return results;
}
