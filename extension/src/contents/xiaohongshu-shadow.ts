import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://creator.xiaohongshu.com/*'],
  run_at: 'document_start',
  world: 'MAIN',
};

const _origAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init: ShadowRootInit) {
  const root = _origAttachShadow.call(this, init);
  (this as any).__shadowRoot__ = root;
  return root;
};

setInterval(() => {
  const signal = document.documentElement.getAttribute('data-xhs-click-publish');
  if (signal !== '1') return;
  document.documentElement.removeAttribute('data-xhs-click-publish');

  const host = document.querySelector('xhs-publish-btn');
  if (!host || !(host as any).__shadowRoot__) {
    document.documentElement.setAttribute('data-xhs-publish-result', 'no-shadow');
    return;
  }

  const btns = (host as any).__shadowRoot__.querySelectorAll('button');
  let clicked = false;
  for (let i = 0; i < btns.length; i++) {
    const text = btns[i].textContent.replace(/\s+/g, ' ').trim();
    if (text === '发布' || text === '立即发布') {
      const rect = btns[i].getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        btns[i].scrollIntoView({ block: 'center' });
        btns[i].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        btns[i].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        btns[i].dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        btns[i].click();
        clicked = true;
        break;
      }
    }
  }

  document.documentElement.setAttribute('data-xhs-publish-result', clicked ? 'clicked' : 'not-found');
}, 500);
