import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../types';

const LIMITS = { maxTitle: 80, maxBody: 100000, maxTags: 10 };

function buildArticleBody(blocks: StandardContent['blocks']): string {
  const lines = blocks.map((block) => {
    switch (block.type) {
      case 'heading': return `${'#'.repeat(block.level || 2)} ${block.text || ''}`;
      case 'paragraph': return block.text || '';
      case 'list': return (block.items || []).map((item) => `- ${item}`).join('\n');
      case 'quote': return `> ${block.text || ''}`;
      case 'image':
        return block.url
          ? `<p style="text-align:center;margin:12px 0;"><img src="${block.url}" alt="${block.caption || block.text || '图片'}" style="max-width:100%;border-radius:4px;"/></p>`
          : '';
      default: return '';
    }
  });
  return lines.filter(Boolean).join('\n\n');
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
      extra: { contentType: 'article', publishKind: 'bilibili-column', supportsMarkdown: true, isOriginal: true },
    };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: false,
    };
  },
};
