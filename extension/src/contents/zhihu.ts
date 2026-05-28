import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://zhuanlan.zhihu.com/*'],
  run_at: 'document_idle',
};

interface FillMessage {
  type: 'FILL_EDITOR';
  platform: string;
  content: { title: string; body: string; tags: string[]; summary?: string };
}

chrome.runtime.onMessage.addListener((message: FillMessage, _sender, sendResponse) => {
  if (message.type !== 'FILL_EDITOR' || message.platform !== 'zhihu') return false;

  const { title, body, tags } = message.content;

  try {
    // Fill title
    const titleInput = document.querySelector('.WriteIndex-titleInput') as HTMLTextAreaElement
      || document.querySelector('[data-testid="editor-title"]') as HTMLElement
      || document.querySelector('textarea[placeholder*="标题"]') as HTMLTextAreaElement;

    if (titleInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value',
      )?.set;
      nativeInputValueSetter?.call(titleInput, title);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Zhihu uses Draft.js — inject via ClipboardEvent simulation
    setTimeout(() => {
      const editor = document.querySelector('.public-DraftEditor-content')
        || document.querySelector('[data-testid="editor-body"]')
        || document.querySelector('[contenteditable="true"]');

      if (editor) {
        const dt = new DataTransfer();
        dt.setData('text/html', body);
        dt.setData('text/plain', body.replace(/<[^>]*>/g, ''));

        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt,
        });

        editor.dispatchEvent(pasteEvent);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '未找到知乎编辑器' });
      }
    }, 800);

    return true;
  } catch (err) {
    sendResponse({ success: false, error: `注入失败: ${err instanceof Error ? err.message : '未知错误'}` });
    return true;
  }
});
