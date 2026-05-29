export type PlatformType = 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu';

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'image';
  level?: 1 | 2 | 3;
  text?: string;
  items?: string[];
  url?: string;
  caption?: string;
}

export interface StandardContent {
  id: string;
  title: string;
  summary?: string;
  rawMarkdown: string;
  blocks: ContentBlock[];
  tags: string[];
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOutput {
  id: string;
  contentId: string;
  platform: PlatformType;
  platformName: string;
  title: string;
  summary?: string;
  body: string;
  tags: string[];
  coverImage?: string;
  extra?: Record<string, unknown>;
  status: 'draft' | 'ready' | 'publishing' | 'published' | 'failed';
  validationMessages: ValidationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationMessage {
  level: 'info' | 'warning' | 'error';
  field: string;
  message: string;
}

export interface PublishRecord {
  id: string;
  outputId: string;
  contentId: string;
  platform: PlatformType;
  platformName: string;
  status: 'success' | 'failed';
  message: string;
  mockUrl?: string;
  publishedAt: string;
}

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  icon: string;
  color: string;
  description: string;
}
