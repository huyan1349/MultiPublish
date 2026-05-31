import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';

const LIMITS = { maxTitle: 80, maxBody: 100000, maxTags: 10 };

function makeColumnTitle(title: string): string {
  return title.trim().substring(0, LIMITS.maxTitle);
}

function buildArticleBody(blocks: StandardContent['blocks']): string {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const tag = block.level === 1 ? 'h2' : `h${(block.level || 2) + 1}`;
        return `<${tag} style="font-size:${block.level === 1 ? '22px' : '18px'};font-weight:bold;color:#333;margin:20px 0 12px;">${block.text || ''}</${tag}>`;
      }
      case 'paragraph':
        return `<p style="font-size:15px;line-height:1.75;color:#333;margin:8px 0;">${block.text || ''}</p>`;
      case 'list': {
        const items = (block.items || []).map((item) => `<li style="margin:4px 0;padding-left:4px;">${item}</li>`).join('');
        return `<ul style="padding-left:24px;margin:8px 0;">${items}</ul>`;
      }
      case 'quote':
        return `<blockquote style="border-left:3px solid #FB7299;padding:8px 16px;color:#666;margin:12px 0;background:#fff5f8;"><p style="font-size:14px;line-height:1.6;margin:4px 0;">${block.text || ''}</p></blockquote>`;
      case 'image':
        return block.url
          ? `<p style="text-align:center;margin:12px 0;"><img src="${block.url}" alt="${block.caption || block.text || '图片'}" style="max-width:100%;border-radius:4px;"/></p>`
          : '';
      default:
        return '';
    }
  }).join('\n');
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
        supportsMarkdown: true,
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
