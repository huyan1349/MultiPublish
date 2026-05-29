import type { PublishPayload, PublishResult } from '../adapters/types';

const EXTENSION_ID = 'cecgmmphokhciflacpegmfpobchjkone';

export async function publishToPlatform(payload: PublishPayload): Promise<PublishResult> {
  if (!chrome?.runtime?.sendMessage) {
    throw new Error('请在 Chrome 浏览器中打开此页面，并确保已安装 ContentBridge 扩展');
  }
  return chrome.runtime.sendMessage(EXTENSION_ID, {
    type: 'PUBLISH_TO_PLATFORM',
    payload,
  });
}

export function isExtensionAvailable(): boolean {
  return !!(chrome?.runtime?.sendMessage);
}
