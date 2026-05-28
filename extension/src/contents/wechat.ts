import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://mp.weixin.qq.com/*'],
  all_frames: true,
  run_at: 'document_idle',
};

interface FillMessage {
  type: 'FILL_EDITOR';
  platform: string;
  content: { title: string; body: string; tags: string[]; summary?: string; coverImage?: string };
}

chrome.runtime.onMessage.addListener((message: FillMessage, _sender, sendResponse) => {
  if (message.type !== 'FILL_EDITOR' || message.platform !== 'wechat') return false;

  const { title, body } = message.content;

  try {
    // WeChat uses UEditor in an iframe — check if we're inside the iframe
    const isInIframe = window.self !== window.top;

    if (isInIframe) {
      // Inside UEditor iframe — fill the contenteditable body
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor) {
        editor.innerHTML = body;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        sendResponse({ success: true });
        return true;
      }
    }

    // In the top frame — try to fill the title first
    const titleInput = document.querySelector('#title') as HTMLTextAreaElement;
    if (titleInput) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Try to find and fill the editor body
    const editorBody = document.querySelector('#ueditor_0') as HTMLIFrameElement;
    if (editorBody?.contentDocument) {
      const innerDoc = editorBody.contentDocument;
      const editable = innerDoc.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editable) {
        editable.innerHTML = body;
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        sendResponse({ success: true });
        return true;
      }
    }

    sendResponse({ success: false, error: '未找到微信公众号编辑器，请确认已打开图文编辑页面' });
  } catch (err) {
    sendResponse({ success: false, error: `注入失败: ${err instanceof Error ? err.message : '未知错误'}` });
  }

  return true;
});
