import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';

const LIMITS = { maxTitle: 80, maxBody: 100000, maxTags: 10 };

function makeColumnTitle(title: string): string {
  return title.trim().substring(0, LIMITS.maxTitle);
}

function cleanInlineText(value = ''): string {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`~#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildArticleBody(blocks: StandardContent['blocks']): string {
  return blocks.flatMap((block) => {
    switch (block.type) {
      case 'heading':
        return cleanInlineText(block.text);
      case 'paragraph':
        return cleanInlineText(block.text);
      case 'list':
        return (block.items || []).map((item, index) => `${index + 1}. ${cleanInlineText(item)}`);
      case 'quote':
        return cleanInlineText(block.text);
      case 'image':
        return cleanInlineText(block.caption || block.text || '');
      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

function buildSummary(body: string): string {
  return body
    .replace(/<img[^>]*>/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/[#>*`\-\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 150);
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
    const title = makeColumnTitle(content.title);
    const body = buildArticleBody(content.blocks);
    const summary = buildSummary(body);
    const tags = content.tags.slice(0, LIMITS.maxTags);

    return {
      title,
      summary,
      body,
      tags,
      coverImage: content.coverImage,
      extra: {
        contentType: 'article',
        publishKind: 'bilibili-column',
        supportsMarkdown: false,
        isOriginal: true,
      },
    };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length,
      bodyCharCount: output.body.length,
      tagCount: output.tags.length,
      maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody,
      maxTags: LIMITS.maxTags,
      needsCover: false,
    };
  },
};
