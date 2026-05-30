import type { PlatformType } from '../types.js';

export interface PublishResult {
  platform: PlatformType;
  platformName: string;
  status: 'success' | 'failed';
  message: string;
  mockUrl?: string;
  publishedAt: string;
}

const BASE_MOCK_URL = 'https://mock.contentbridge.local';

export function mockPublish(
  platform: PlatformType,
  platformName: string,
  outputId: string,
): PublishResult {
  const mockUrl = `${BASE_MOCK_URL}/${platform}/post_${outputId}`;
  return {
    platform,
    platformName,
    status: 'success',
    message: `模拟发布成功 — 已发布到${platformName}`,
    mockUrl,
    publishedAt: new Date().toISOString(),
  };
}
