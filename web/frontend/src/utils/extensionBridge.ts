let _extensionId = localStorage.getItem('cb_extension_id') || '';

if (typeof window !== 'undefined') {
  window.addEventListener('multipublish:extension-id', ((e: CustomEvent) => {
    _extensionId = e.detail;
    localStorage.setItem('cb_extension_id', _extensionId);
  }) as EventListener);
}

export interface ImagePayload {
  id: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
}

export interface ExtensionPublishPayload {
  platform: 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu' | 'weibo';
  content: {
    title: string;
    body: string;
    tags?: string[];
    summary?: string;
    coverImage?: string;
  };
  autoLayout?: boolean;
  images?: ImagePayload[];
}

export interface ExtensionPublishResult {
  platform: string;
  platformName: string;
  success: boolean;
  status?: 'success' | 'failed';
  message: string;
  error?: string;
  mockUrl?: string;
}

interface ChromeRuntime {
  sendMessage?(extensionId: string, message: unknown, callback: (response: ExtensionPublishResult) => void): void;
  lastError?: { message: string };
}

interface ChromeNs {
  runtime?: ChromeRuntime;
}

type RawExtensionPublishResult = Partial<ExtensionPublishResult> & {
  status?: 'success' | 'failed';
};

function normalizePublishResult(response: RawExtensionPublishResult): ExtensionPublishResult {
  const success = typeof response.success === 'boolean'
    ? response.success
    : response.status === 'success';

  return {
    platform: response.platform || '',
    platformName: response.platformName || response.platform || '',
    success,
    status: response.status || (success ? 'success' : 'failed'),
    message: response.message || response.error || (success ? '发布成功' : '发布失败'),
    error: response.error,
    mockUrl: response.mockUrl,
  };
}

function getChrome(): ChromeNs | null {
  if (typeof chrome !== 'undefined' && chrome.runtime) return chrome as unknown as ChromeNs;
  return null;
}

export function isExtensionInstalled(): boolean {
  return !!_extensionId || !!getChrome()?.runtime;
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
    const extId = _extensionId || localStorage.getItem('cb_extension_id') || '';
    if (!extId) {
      reject(new Error('未检测到扩展，请确认 MultiPublish 扩展已安装并启用'));
      return;
    }

    const cr = getChrome();
    if (!cr?.runtime?.sendMessage) {
      reject(new Error('扩展通信失败，请确认 MultiPublish 扩展已安装并启用'));
      return;
    }

    try {
      cr.runtime.sendMessage(
        extId,
        { type: 'PUBLISH_TO_PLATFORM', ...payload },
        (response: RawExtensionPublishResult) => {
          if (cr.runtime?.lastError) {
            reject(new Error(`扩展通信失败: ${cr.runtime.lastError.message}`));
            return;
          }
          if (!response || typeof response !== 'object') {
            reject(new Error('扩展未响应，可能已休眠，请刷新页面后重试'));
            return;
          }
          resolve(normalizePublishResult(response));
        },
      );
    } catch {
      reject(new Error('扩展通信失败，请确认 MultiPublish 扩展已安装并启用'));
    }
  });
}

export function setExtensionId(id: string) {
  _extensionId = id;
  localStorage.setItem('cb_extension_id', id);
}

export function getExtensionId(): string {
  return _extensionId || localStorage.getItem('cb_extension_id') || '';
}
