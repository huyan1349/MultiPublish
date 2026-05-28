import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://creator.xiaohongshu.com/*'],
  run_at: 'document_idle',
};

interface FillMessage {
  type: 'FILL_EDITOR';
  platform: string;
  content: { title: string; body: string; tags: string[]; summary?: string };
}

chrome.runtime.onMessage.addListener((message: FillMessage, _sender, sendResponse) => {
  if (message.type !== 'FILL_EDITOR' || message.platform !== 'xiaohongshu') return false;

  const { title, body, tags } = message.content;

  try {
    // Xiaohongshu: title input + textarea body
    const titleInput = document.querySelector('input[placeholder*="标题"]') as HTMLInputElement
      || document.querySelector('#title') as HTMLInputElement;
    if (titleInput) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(titleInput, title);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const bodyInput = document.querySelector('textarea[placeholder*="笔记"]') as HTMLTextAreaElement
      || document.querySelector('#content') as HTMLTextAreaElement
      || document.querySelector('textarea');

    if (bodyInput) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      const plainText = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      setter?.call(bodyInput, plainText);
      bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Fill tags if tag input exists
    const tagInput = document.querySelector('input[placeholder*="话题"]') as HTMLInputElement;
    if (tagInput && tags.length > 0) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(tagInput, tags.join(' '));
      tagInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: `注入失败: ${err instanceof Error ? err.message : '未知错误'}` });
  }

  return true;
});
