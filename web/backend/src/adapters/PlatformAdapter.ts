export type PlatformType = 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu' | 'weibo';

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
}

export interface ValidationMessage {
  level: 'info' | 'warning' | 'error';
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

export interface PlatformOutputDraft {
  title: string;
  summary?: string;
  body: string;
  tags: string[];
  coverImage?: string;
  extra?: Record<string, unknown>;
}

export interface PreviewMeta {
  titleCharCount: number;
  bodyCharCount: number;
  tagCount: number;
  maxTitleLength: number;
  maxBodyLength: number;
  maxTags: number;
  needsCover: boolean;
}

export interface PlatformAdapter {
  platform: PlatformType;
  displayName: string;
  validate(content: StandardContent): ValidationResult;
  transform(content: StandardContent): PlatformOutputDraft;
  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta;
}
