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
  return publishViaExtensionMessage(payload);
}

async function publishViaExtensionMessage(
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
