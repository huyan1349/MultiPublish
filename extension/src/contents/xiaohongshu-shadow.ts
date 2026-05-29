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
