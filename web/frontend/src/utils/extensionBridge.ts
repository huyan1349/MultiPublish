const EXTENSION_ID = localStorage.getItem('cb_extension_id') || '';

export interface ExtensionPublishPayload {
  platform: 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu';
  content: {
    title: string;
    body: string;
    tags?: string[];
    summary?: string;
    coverImage?: string;
  };
  autoLayout?: boolean;
}

export interface ExtensionPublishResult {
  platform: string;
  platformName: string;
  success: boolean;
  message: string;
  error?: string;
}

interface ChromeRuntime {
  sendMessage?(extensionId: string, message: unknown, callback: (response: ExtensionPublishResult) => void): void;
  lastError?: { message: string };
}

interface ChromeNs {
  runtime?: ChromeRuntime;
}

function getChrome(): ChromeNs | null {
  if (typeof chrome !== 'undefined' && chrome.runtime) return chrome as unknown as ChromeNs;
  return null;
}

export function isExtensionInstalled(): boolean {
  return !!EXTENSION_ID || !!getChrome()?.runtime;
}

export async function publishViaExtension(
  payload: ExtensionPublishPayload,
): Promise<ExtensionPublishResult> {
  if (payload.platform === 'wechat') {
    return publishWechatViaClipboard(payload);
  }

  return publishOtherViaExtension(payload);
}

async function publishWechatViaClipboard(
  payload: ExtensionPublishPayload,
): Promise<ExtensionPublishResult> {
  try {
    const html = payload.content.body || '';
    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([html.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
    ]);

    const cr = getChrome();
    if (cr?.runtime?.sendMessage && EXTENSION_ID) {
      cr.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'COPY_AND_OPEN_WECHAT', payload: { title: payload.content.title, body: payload.content.body } },
        () => { /* fire and forget */ },
      );
    }

    return {
      platform: 'wechat',
      platformName: '微信公众号',
      success: true,
      message: '内容已复制到剪贴板，请在公众号编辑器中按 Ctrl+V 粘贴',
    };
  } catch (err) {
    return {
      platform: 'wechat',
      platformName: '微信公众号',
      success: false,
      message: err instanceof Error ? err.message : '剪贴板复制失败',
    };
  }
}

async function publishOtherViaExtension(
  payload: ExtensionPublishPayload,
): Promise<ExtensionPublishResult> {
  return new Promise((resolve, reject) => {
    if (!EXTENSION_ID) {
      reject(new Error('未配置扩展 ID，请在设置中填写 Chrome 扩展 ID'));
      return;
    }

    const cr = getChrome();
    if (!cr?.runtime?.sendMessage) {
      reject(new Error('扩展通信失败，请确认 MultiPublish 扩展已安装并启用'));
      return;
    }

    try {
      cr.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'PUBLISH_TO_PLATFORM', ...payload },
        (response: ExtensionPublishResult) => {
          if (cr.runtime?.lastError) {
            reject(new Error(`扩展通信失败: ${cr.runtime.lastError.message}`));
            return;
          }
          resolve(response);
        },
      );
    } catch {
      reject(new Error('扩展通信失败，请确认 MultiPublish 扩展已安装并启用'));
    }
  });
}

export function setExtensionId(id: string) {
  localStorage.setItem('cb_extension_id', id);
}

export function getExtensionId(): string {
  return EXTENSION_ID;
}
