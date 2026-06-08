import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';
import { blocksToPlainText } from '../../services/parserService.js';

const LIMITS = { maxTitle: 32, maxBody: 2000, maxTags: 6 };

function formatTitle(title: string): string {
  const cleaned = title.replace(/#/g, '').trim();
  if (cleaned.length <= LIMITS.maxTitle) return cleaned;
  return cleaned.substring(0, LIMITS.maxTitle - 1) + '…';
}

function buildWeiboBody(blocks: StandardContent['blocks']): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        lines.push(`【${b.text}】`);
        lines.push('');
        break;
      case 'paragraph': {
        const text = (b.text || '').trim();
        if (text) lines.push(text);
        lines.push('');
        break;
      }
      case 'list': {
        for (const item of (b.items || [])) {
          lines.push(`· ${item}`);
        }
        lines.push('');
        break;
      }
      case 'quote':
        lines.push(`//@: ${(b.text || '').replace(/\n/g, ' ')}`);
        lines.push('');
        break;
      case 'image':
        lines.push(`[图片: ${b.caption || b.url || ''}]`);
        lines.push('');
        break;
    }
  }

  let body = lines.join('\n').substring(0, LIMITS.maxBody);
  if (!body.includes('#')) {
    body += '\n\n#每日分享# #内容创作# #干货分享#';
  }
  return body;
}

export const weiboAdapter: PlatformAdapter = {
  platform: 'weibo',
  displayName: '微博',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'error', field: 'title', message: `微博标题建议不超过${LIMITS.maxTitle}字` });
    }
    const plainText = blocksToPlainText(content.blocks);
    if (plainText.length > LIMITS.maxBody) {
      messages.push({ level: 'warning', field: 'body', message: `正文超过${LIMITS.maxBody}字，长微博将自动截断` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'info', field: 'tags', message: `话题最多${LIMITS.maxTags}个` });
    }
    if (!content.coverImage) {
      messages.push({ level: 'info', field: 'coverImage', message: '建议配图提升曝光率' });
    }
    return { valid: true, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = formatTitle(content.title);
    const body = buildWeiboBody(content.blocks);
    const tags = content.tags.slice(0, LIMITS.maxTags).map((t) => {
      if (t.startsWith('#') && t.endsWith('#')) return t;
      if (t.startsWith('#')) return t;
      return `#${t}#`;
    });
    return { title, body, tags,
      coverImage: content.coverImage,
      extra: { contentType: 'weibo', style: 'social', ratio: 'square' } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
