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

export function isExtensionInstalled(): boolean {
  return !!EXTENSION_ID || typeof chrome !== 'undefined' && !!(chrome as Record<string, unknown>).runtime;
}

export async function publishViaExtension(
  payload: ExtensionPublishPayload,
): Promise<ExtensionPublishResult> {
  return new Promise((resolve, reject) => {
    if (!EXTENSION_ID) {
      reject(new Error('未配置扩展 ID，请在设置中填写 Chrome 扩展 ID'));
      return;
    }

    try {
      (chrome as Record<string, unknown>).runtime?.sendMessage?.(
        EXTENSION_ID,
        { type: 'PUBLISH_TO_PLATFORM', ...payload },
        (response: ExtensionPublishResult) => {
          if ((chrome as Record<string, unknown>).runtime?.lastError) {
            reject(new Error(`扩展通信失败: ${(chrome as Record<string, { lastError?: { message: string } }>).runtime.lastError?.message}`));
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
