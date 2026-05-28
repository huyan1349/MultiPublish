import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://member.bilibili.com/*'],
  run_at: 'document_idle',
};

interface FillMessage {
  type: 'FILL_EDITOR';
  platform: string;
  content: { title: string; body: string; tags: string[]; summary?: string; coverImage?: string };
}

chrome.runtime.onMessage.addListener((message: FillMessage, _sender, sendResponse) => {
  if (message.type !== 'FILL_EDITOR' || message.platform !== 'bilibili') return false;

  const { title, body, tags } = message.content;

  try {
    // Fill title
    const titleInput = document.querySelector('input[placeholder*="标题"]') as HTMLInputElement
      || document.querySelector('.title-input input') as HTMLInputElement;
    if (titleInput) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(titleInput, title);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Fill body — B站专栏 uses Quill.js
    setTimeout(() => {
      const editor = document.querySelector('.ql-editor') as HTMLElement
        || document.querySelector('[contenteditable="true"]') as HTMLElement;

      if (editor) {
        editor.innerHTML = body.replace(/\n\n/g, '<p><br></p>').replace(/\n/g, '<br>');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.focus();
      }

      // Fill tags
      const tagInput = document.querySelector('input[placeholder*="标签"]') as HTMLInputElement
        || document.querySelector('.tag-input input') as HTMLInputElement;
      if (tagInput && tags.length > 0) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(tagInput, tags.join(','));
        tagInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      sendResponse({ success: true });
    }, 1000);

    return true;
  } catch (err) {
    sendResponse({ success: false, error: `注入失败: ${err instanceof Error ? err.message : '未知错误'}` });
    return true;
  }
});
