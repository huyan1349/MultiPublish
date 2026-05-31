import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../types';

const LIMITS = { maxTitle: 80, maxBody: 100000, maxTags: 10 };

function countBodyChars(body: string): number {
  return body.replace(/<[^>]*>/g, '').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '').length;
}

function buildArticleBody(blocks: StandardContent['blocks']): string {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `## ${block.text || ''}`;
      case 'paragraph':
        return block.text || '';
      case 'list':
        return (block.items || []).map((item) => `- ${item}`).join('\n');
      case 'quote':
        return `> ${block.text || ''}`;
      case 'image':
        return block.url
          ? `![${block.caption || block.text || '图片'}](${block.url})`
          : '';
      default: return '';
    }
  }).filter(Boolean).join('\n\n');
}

export const bilibiliAdapter: PlatformAdapter = {
  platform: 'bilibili',
  displayName: 'B站',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'error', field: 'title', message: `B站专栏标题最多${LIMITS.maxTitle}字` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'warning', field: 'tags', message: `B站标签建议不超过${LIMITS.maxTags}个` });
    }
    if (content.blocks.length === 0) {
      messages.push({ level: 'error', field: 'body', message: '正文不能为空' });
    }
    return { valid: messages.every((m) => m.level !== 'error'), messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = content.title.trim().substring(0, LIMITS.maxTitle);
    const body = buildArticleBody(content.blocks);
    const tags = content.tags.slice(0, LIMITS.maxTags);
    return {
      title, body, tags,
      coverImage: content.coverImage,
      extra: { contentType: 'article', publishKind: 'bilibili-column', supportsMarkdown: false, isOriginal: true },
    };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: countBodyChars(output.body),
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: false,
    };
  },
};
