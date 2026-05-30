import type { PlasmoCSConfig } from 'plasmo';
import { showContentBridgeToast } from '../shared/contentToast';

export const config: PlasmoCSConfig = {
  matches: ['https://member.bilibili.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

const PLATFORM = 'bilibili';
const NAME = 'B站';
const FILL_TIMEOUT = 40000;
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

    // ── 上传正文图片（GET_IMAGES，不删数据，多 frame 安全）──
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES', payload: { platform: PLATFORM } });
      const allImages = (resp?.images || []) as { id: string; dataUrl: string; filename: string; mimeType: string }[];
      const bodyImages = allImages.filter((img: { id: string }) => img.id !== 'cover');
      console.log('[BILI-IMG] GET_IMAGES:', allImages.length, 'total,', bodyImages.length, 'body');
      if (bodyImages.length > 0) {
        const ed = findBodyEditor();
        if (ed) { ed.focus(); ed.click(); await sleep(300); }
        for (const img of bodyImages) {
          console.log('[BILI-IMG] 上传:', img.id, img.dataUrl.length);
          const ok = await uploadBiliImage(img);
          console.log('[BILI-IMG] 结果:', ok ? 'OK' : 'FAIL');
          if (ok) await sleep(1500);
        }
        await sleep(3000);
      }
    } catch (e) { console.log('[BILI-IMG] err:', e); }

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

  // 正文编辑器：多重兜底
  let ed = await waitForElement(findBodyEditor, FILL_TIMEOUT);
  if (!ed) {
    console.log('[ContentBridge:Bilibili] 正文编辑器未匹配，dump 页面状态:');
    dumpPageState();
    // 激进兜底：找页面上最大的 contenteditable（排除标题）
    ed = findFallbackEditor();
  }

  if (ed) {
    console.log('[ContentBridge:Bilibili] 正文编辑器最终匹配:', ed.tagName, (ed.className && typeof ed.className === 'string' ? ed.className : '').slice(0, 60));
    // B站是 React 编辑器，优先用 React 直填（paste HTML），标准填充做兜底
    let ok = await fillReactEditor(ed, body);
    console.log('[ContentBridge:Bilibili] React 直填结果:', ok);
    if (!ok) {
      ok = await fillTextTarget(ed, body);
      console.log('[ContentBridge:Bilibili] 标准填充兜底结果:', ok);
    }
  } else {
    console.log('[ContentBridge:Bilibili] 所有兜底均未找到正文编辑器');
  }

  await fillTags(tags);
  return !!(titleEl || ed);
}

/* ── Auto Publish: XPath 盲搜 + MutationObserver + React Fiber ── */

const PUBLISH_LABELS = ['发布', '立即发布', '发布文章', '发表', '投稿', '确认发布', '提交发布', '发布图文', '立即投稿'];
const CONFIRM_LABELS = ['确认', '确定', '确认发布', '提交', '知道了', '我知道了', '好的', '是', '立即发布', '发布'];

async function tryAutoPublish(): Promise<{ success: boolean; message: string }> {
  await sleep(2000);

  // 第一步：XPath 盲搜初始发布按钮（不依赖任何 class 名）
  const publishBtn = findButtonByXPath(PUBLISH_LABELS);
  if (!publishBtn) {
    console.log('[ContentBridge:Bilibili] 未找到发布按钮，dump 页面文本:');
    dumpAllTexts();
    return { success: false, message: '未找到B站图文发布按钮' };
  }

  console.log('[ContentBridge:Bilibili] 初始发布按钮:', btnLabel(publishBtn));
  forceClick(publishBtn);

  // 第二步：MutationObserver 监听 + XPath 盲搜循环
  let clickedElements = new Set<HTMLElement>([publishBtn]);

  for (let round = 0; round < 15; round++) {
    // 等 DOM 变化或超时
    const changed = await waitForDomChange(2500);
    await sleep(600);

    if (hasPublishSuccessSignal()) {
      return { success: true, message: 'B站图文已自动提交发布' };
    }

    // XPath 盲搜确认按钮 — 不依赖 class，只按文本找
    const confirmBtn = findButtonByXPath(CONFIRM_LABELS);
    if (confirmBtn && !clickedElements.has(confirmBtn)) {
      console.log('[ContentBridge:Bilibili] 第', round + 1, '轮 XPath 找到:', btnLabel(confirmBtn));
      forceClick(confirmBtn);
      clickedElements.add(confirmBtn);
      await sleep(1000);
      if (hasPublishSuccessSignal()) {
        return { success: true, message: 'B站图文已自动提交发布' };
      }
      continue;
    }

    // 策略 B: 找 DOM 最后出现的匹配按钮（弹窗通常在最后）
    const lastMatch = findLastMatchingButton([...PUBLISH_LABELS, ...CONFIRM_LABELS]);
    if (lastMatch && !clickedElements.has(lastMatch)) {
      console.log('[ContentBridge:Bilibili] 第', round + 1, '轮 lastMatch:', btnLabel(lastMatch));
      forceClick(lastMatch);
      clickedElements.add(lastMatch);
      await sleep(1000);
      if (hasPublishSuccessSignal()) {
        return { success: true, message: 'B站图文已自动提交发布' };
      }
      continue;
    }

    // 策略 C: 找高 z-index 层中的按钮
    if (changed) {
      const overlayBtn = findButtonInTopLayer(CONFIRM_LABELS);
      if (overlayBtn && !clickedElements.has(overlayBtn)) {
        console.log('[ContentBridge:Bilibili] 第', round + 1, '轮 topLayer:', btnLabel(overlayBtn));
        forceClick(overlayBtn);
        clickedElements.add(overlayBtn);
        await sleep(1000);
        if (hasPublishSuccessSignal()) {
          return { success: true, message: 'B站图文已自动提交发布' };
        }
        continue;
      }
    }

    // 第5轮 dump 调试
    if (round === 4) {
      console.log('[ContentBridge:Bilibili] 第5轮 dump:');
      dumpAllTexts();
    }
  }

  // 最终兜底：XPath 全量扫描 + 全点
  console.log('[ContentBridge:Bilibili] 兜底 XPath 全扫描');
  const allTargets = findAllByXPath([...PUBLISH_LABELS, ...CONFIRM_LABELS]);
  for (const target of allTargets) {
    if (hasPublishSuccessSignal()) break;
    if (clickedElements.has(target)) continue;
    console.log('[ContentBridge:Bilibili] 兜底点击:', btnLabel(target));
    forceClick(target);
    clickedElements.add(target);
    await sleep(1200);
  }

  return hasPublishSuccessSignal()
    ? { success: true, message: 'B站图文已自动提交发布' }
    : { success: true, message: '已自动点击B站图文发布流程，请在页面确认最终状态' };
}

/* ── XPath 文本搜索（不依赖 class 名）── */

function findByXPath(labels: string[], root: Node = document): HTMLElement | null {
  for (const label of labels) {
    // 匹配元素文本内容（含子元素文本，如 <button><span>发布</span></button>）
    const exact = `.//*[normalize-space(.)='${label}']`;
    const r1 = safeEvalXPath(exact, root);
    if (r1) return r1;
    // 直接文本节点精确匹配
    const exactText = `.//*[normalize-space(text())='${label}']`;
    const r2 = safeEvalXPath(exactText, root);
    if (r2) return r2;
    // 包含匹配
    const contains = `.//*[contains(normalize-space(.), '${label}')]`;
    const r3 = safeEvalXPath(contains, root);
    if (r3) return r3;
  }
  return null;
}

function findAllByXPath(labels: string[], root: Node = document): HTMLElement[] {
  const results: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  for (const label of labels) {
    const xpath = `.//*[contains(normalize-space(.), '${label}')]`;
    try {
      const iter = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      let node = iter.iterateNext();
      while (node) {
        const el = node as HTMLElement;
        if (isVisible(el) && !isDisabled(el) && !seen.has(el)) {
          seen.add(el);
          results.push(el);
        }
        node = iter.iterateNext();
      }
    } catch { /* invalid xpath */ }
  }
  return results;
}

function findButtonByXPath(labels: string[]): HTMLElement | null {
  // XPath 优先
  const xpResult = findByXPath(labels);
  if (xpResult) return xpResult;

  // CSS 兜底：TreeWalker 扫描任意可见元素
  return findAnyElementByText(labels);
}

function findLastMatchingButton(labels: string[]): HTMLElement | null {
  const all = findAllByXPath(labels);
  // 排除太宽泛的匹配（比如正文中出现了"发布"这个词）
  const candidates = all.filter((el) => {
    const text = compactText(el.innerText || el.textContent || '');
    // 按钮文本通常很短
    return text.length <= 20 && labels.some((l) => text === l || text.startsWith(l) || text.endsWith(l));
  });
  return candidates[candidates.length - 1] || null;
}

function findButtonInTopLayer(labels: string[]): HTMLElement | null {
  // 找 z-index 最高层的可见元素
  const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
    .filter(isVisible)
    .filter((el) => {
      const z = parseInt(window.getComputedStyle(el).zIndex, 10);
      return !isNaN(z) && z > 0 && z < 10000;
    })
    .sort((a, b) => {
      const za = parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
      const zb = parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
      return zb - za;
    });

  // 在 z-index 最高的容器中找按钮
  const topZ = all[0] ? parseInt(window.getComputedStyle(all[0]).zIndex, 10) : 0;
  const topLayers = all.filter((el) => parseInt(window.getComputedStyle(el).zIndex, 10) === topZ);

  for (const layer of topLayers.slice(0, 5)) {
    const btn = findByXPath(labels, layer);
    if (btn && isVisible(btn) && !isDisabled(btn)) return btn;
  }

  // 兜底：z-index 没找到，用 DOM 最后出现的匹配元素
  return findLastMatchingButton(labels);
}

function safeEvalXPath(xpath: string, root: Node): HTMLElement | null {
  try {
    const result = document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const el = result.singleNodeValue as HTMLElement | null;
    if (el && isVisible(el) && !isDisabled(el)) return el;
    return null;
  } catch {
    return null;
  }
}

/* ── TreeWalker 兜底：按文本扫描任意可见元素 ── */

function findAnyElementByText(labels: string[], root: ParentNode = document): HTMLElement | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement;
      if (!isVisible(el) || isDisabled(el)) return NodeFilter.FILTER_SKIP;
      const text = compactText(el.innerText || el.textContent || '');
      if (!text || text.length > 50) return NodeFilter.FILTER_SKIP;
      if (labels.some((l) => text === l || text.includes(l))) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });

  const candidates: HTMLElement[] = [];
  let node = walker.nextNode();
  while (node) {
    candidates.push(node as HTMLElement);
    node = walker.nextNode();
  }

  if (candidates.length === 0) return null;
  // 取文本最短的（最精确匹配）
  candidates.sort((a, b) => {
    const ta = compactText(a.innerText || a.textContent || '').length;
    const tb = compactText(b.innerText || b.textContent || '').length;
    return ta - tb;
  });
  return candidates[0];
}

/* ── Click（多层穿透）── */

function forceClick(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  el.click();

  // React fiber 穿透：直接调用 React 内部 onClick handler
  reactClick(el);

  // 坐标点击：用元素中心点找实际渲染的元素
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const target = document.elementFromPoint(cx, cy);
  if (target && target !== el) {
    (target as HTMLElement).click();
    reactClick(target as HTMLElement);
  }
}

function reactClick(el: HTMLElement) {
  const fiberKey = Object.keys(el).find(
    (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'),
  );
  if (!fiberKey) return;

  let fiber = (el as any)[fiberKey];
  let depth = 0;
  while (fiber && depth < 20) {
    const props = fiber.memoizedProps || fiber.pendingProps;
    if (props?.onClick) {
      try {
        props.onClick(new MouseEvent('click', { bubbles: true, cancelable: true }));
        console.log('[ContentBridge:Bilibili] React fiber onClick 触发成功');
        return;
      } catch { /* ignore */ }
    }
    fiber = fiber.return;
    depth++;
  }
}

/* ── MutationObserver ── */

function waitForDomChange(timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; observer.disconnect(); resolve(false); }
    }, timeout);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          if (!resolved) { resolved = true; clearTimeout(timer); observer.disconnect(); resolve(true); }
          return;
        }
        if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class' || m.attributeName === 'hidden')) {
          if (!resolved) { resolved = true; clearTimeout(timer); observer.disconnect(); resolve(true); }
          return;
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'],
    });
  });
}

/* ── Diagnostics ── */

function btnLabel(el: HTMLElement): string {
  return compactText(el.innerText || el.textContent || '') || el.tagName;
}

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

function dumpAllTexts() {
  // dump 页面上所有短文本元素（可能是按钮），不限制 class
  const els = Array.from(document.querySelectorAll<HTMLElement>('*'))
    .filter(isVisible)
    .filter((el) => !isDisabled(el))
    .map((el) => ({ text: compactText(el.innerText || el.textContent || ''), tag: el.tagName, cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 40) }))
    .filter(({ text }) => text.length >= 1 && text.length <= 20);
  console.log('[ContentBridge:Bilibili] 页面短文本元素:', els.length);
  els.slice(0, 30).forEach(({ text, tag, cls }) => console.log(`  - "${text}"  <${tag}> [${cls}]`));
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

function findFallbackEditor(): HTMLElement | null {
  const titleEl = findTitleEditor();
  // 找所有可见的 contenteditable 或大 textarea，排除标题
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    '[contenteditable="true"], textarea, [role="textbox"], div[class*="editor"], div[class*="Editor"]',
  ))
    .filter(isVisible)
    .filter((el) => el !== titleEl && !titleEl?.contains(el) && !el.contains(titleEl!))
    .map((el) => ({ el, area: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
    .filter(({ area }) => area > 1000)
    .sort((a, b) => b.area - a.area);

  console.log('[ContentBridge:Bilibili] 兜底候选编辑器:', candidates.length, '个');
  candidates.slice(0, 5).forEach((c, i) => {
    console.log(`  [${i}] ${c.el.tagName} ${(c.el.className && typeof c.el.className === 'string' ? c.el.className : '').slice(0, 50)} area=${c.area}`);
  });

  return candidates[0]?.el || null;
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

async function fillReactEditor(el: HTMLElement, text: string): Promise<boolean> {
  // React 编辑器（如 Slate.js / ProseMirror / Quill）可能不响应 innerHTML 直接赋值
  // 策略：通过 React fiber 找到 state updater 或直接触发原生输入事件序列
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  await sleep(200);

  const before = compactText(el.innerText || el.textContent || '');

  // 策略 A: 选中全部 + execCommand（适用 contenteditable）
  if (selectAllContent(el)) {
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, text);
    await sleep(300);
    const after = compactText(el.innerText || el.textContent || '');
    if (after !== before && after.length > 10) {
      console.log('[ContentBridge:Bilibili] React 填充: execCommand 成功');
      return true;
    }
  }

  // 策略 B: 逐字符输入（模拟键盘，触发 React onChange）
  // 先清空
  if (selectAllContent(el)) {
    document.execCommand('delete', false);
  }
  el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'deleteContent' }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' }));
  await sleep(100);

  // 逐段输入
  const chunks = text.match(/.{1,200}/g) || [text];
  for (const chunk of chunks) {
    const data = new DataTransfer();
    data.setData('text/plain', chunk);
    data.setData('text/html', markdownToHtml(chunk));
    el.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: data,
    }));
    await sleep(100);
  }

  // 触发了 input 事件后等 React 更新
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
  el.blur();
  el.focus();
  await sleep(500);

  const after = compactText(el.innerText || el.textContent || '');
  if (after !== before && after.length > 10) {
    console.log('[ContentBridge:Bilibili] React 填充: 分段 paste 成功');
    return true;
  }

  // 策略 C: 直接设置 textContent + dispatch input
  el.textContent = text;
  el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(300);

  const after2 = compactText(el.innerText || el.textContent || '');
  return after2 !== before && after2.length > 10;
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

/* ── 图片上传 ── */

function _dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const _nativeFS = (() => {
  try { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files'); return d?.set || null; }
  catch { return null; }
})();

function _setInputFiles(input: HTMLInputElement, file: File): void {
  const dt = new DataTransfer();
  dt.items.add(file);
  if (_nativeFS) _nativeFS.call(input, dt.files);
  else input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function uploadBiliImage(img: { dataUrl: string; filename: string; mimeType: string }): Promise<boolean> {
  const blob = _dataUrlToBlob(img.dataUrl);
  const file = new File([blob], img.filename || 'img.png', { type: img.mimeType || 'image/png' });

  // Phase 1: 遍历已存在的 file input
  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  console.log('[BILI-IMG] 已有 file input 数量:', inputs.length);
  for (let i = 0; i < inputs.length; i++) {
    const inp = inputs[i];
    console.log('[BILI-IMG] Phase1 尝试 input', i, 'accept=', inp.getAttribute('accept'), 'visible=', inp.offsetParent !== null);
    _setInputFiles(inp, file);
    await sleep(2500);
    const ed = findBodyEditor();
    if (ed?.querySelectorAll('img').length) { console.log('[BILI-IMG] Phase1 成功!'); return true; }
  }

  // Phase 2: 直接操作 eva3-toolbar-image → shadow DOM
  console.log('[BILI-IMG] Phase2...');

  const imgToolbar = document.querySelector('eva3-toolbar-image');
  console.log('[BILI-IMG] eva3-toolbar-image:', imgToolbar ? '找到' : '未找到');
  if (!imgToolbar) return false;

  // 用原生 click() + forceClick 触发（B站已有函数，走鼠标事件 + React Fiber）
  forceClick(imgToolbar as HTMLElement);
  await sleep(800);

  // MutationObserver 监控新增的 input[type="file"]
  let newInput: HTMLInputElement | null = null;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLInputElement && node.type === 'file') {
          console.log('[BILI-IMG] MO 捕获到新增 file input');
          newInput = node;
          observer.disconnect();
          return;
        }
        if (node instanceof HTMLElement) {
          const inp = node.querySelector<HTMLInputElement>('input[type="file"]');
          if (inp) {
            console.log('[BILI-IMG] MO 捕获到子树中的 file input');
            newInput = inp;
            observer.disconnect();
            return;
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 拦截 HTMLInputElement.prototype.click
  let capturedClick: HTMLInputElement | null = null;
  const origClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
    console.log('[BILI-IMG] 拦截 input.click');
    capturedClick = this;
  };

  // 找 dropdown 里"上传图片"按钮 —— 也在 shadow DOM 里递归搜
  const allItems = _deepQuerySelectorAll(imgToolbar, '.item');
  console.log('[BILI-IMG] dropdown items:', allItems.length, allItems.map(e => (e.textContent || '').trim()));
  const uploadItem = allItems.find(e => (e.textContent || '').trim() === '上传图片') || allItems[0];

  if (uploadItem) {
    console.log('[BILI-IMG] 点击:', (uploadItem.textContent || '').trim());
    forceClick(uploadItem);
  } else {
    // 直接点 eva3-icon
    const icon = _deepQuerySelector(imgToolbar, 'eva3-icon');
    if (icon) {
      console.log('[BILI-IMG] 直接点 eva3-icon');
      forceClick(icon as HTMLElement);
    }
  }
  await sleep(1000);

  HTMLInputElement.prototype.click = origClick;
  observer.disconnect();

  // 检查结果
  const fileInput = capturedClick || newInput || document.querySelector<HTMLInputElement>('input[type="file"]');
  console.log('[BILI-IMG] file input:', fileInput ? '有' : '无',
    'capturedClick:', !!capturedClick, 'MO:', !!newInput, 'querySelector:', !!document.querySelector('input[type="file"]'));

  if (fileInput) {
    _setInputFiles(fileInput, file);
    await sleep(3000);
    const ed = findBodyEditor();
    if (ed?.querySelectorAll('img').length) { console.log('[BILI-IMG] Phase2 成功!'); return true; }
  }

  console.log('[BILI-IMG] Phase2 失败');
  return false;
}

function _deepQuerySelector(root: Element, selector: string): Element | null {
  if (root.shadowRoot) {
    const found = root.shadowRoot.querySelector(selector);
    if (found) return found;
    for (const child of root.shadowRoot.children) {
      const r = _deepQuerySelector(child, selector);
      if (r) return r;
    }
  }
  for (const child of root.children) {
    const r = _deepQuerySelector(child, selector);
    if (r) return r;
  }
  return null;
}

function _deepQuerySelectorAll(root: Element, selector: string): HTMLElement[] {
  const results: HTMLElement[] = [];
  if (root.shadowRoot) {
    root.shadowRoot.querySelectorAll(selector).forEach(e => results.push(e as HTMLElement));
    for (const child of root.shadowRoot.children) {
      results.push(..._deepQuerySelectorAll(child, selector));
    }
  }
  for (const child of root.children) {
    results.push(..._deepQuerySelectorAll(child, selector));
  }
  return results;
}
