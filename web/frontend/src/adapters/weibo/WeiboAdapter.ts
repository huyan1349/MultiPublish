import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../types';
import { blocksToPlainText } from '../parserService';

const LIMITS = { maxTitle: 32, maxBody: 2000, maxTags: 6 };

function countBodyChars(body: string): number {
  return body.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '').length;
}

function formatTitle(title: string): string {
  const cleaned = title.replace(/#/g, '').trim();
  if (cleaned.length <= LIMITS.maxTitle) return cleaned;
  return cleaned.substring(0, LIMITS.maxTitle - 1) + '…';
}

function buildWeiboBody(blocks: StandardContent['blocks']): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        parts.push(`<p style="font-size:16px;font-weight:bold;margin:12px 0 6px;color:#E6162D;">【${b.text}】</p>`);
        break;
      case 'paragraph': {
        const text = (b.text || '').trim();
        parts.push(`<p style="font-size:14px;line-height:1.8;color:#333;margin:6px 0;">${text}</p>`);
        break;
      }
      case 'list': {
        const items = (b.items || []).map(item =>
          `<li style="margin:3px 0;padding-left:4px;">· ${item}</li>`
        ).join('');
        parts.push(`<ul style="padding-left:20px;margin:6px 0;list-style:none;">${items}</ul>`);
        break;
      }
      case 'quote':
        parts.push(`<blockquote style="border-left:3px solid #E6162D;padding:6px 12px;color:#666;margin:8px 0;background:#fef5f6;"><p style="font-size:13px;line-height:1.6;margin:0;">//@ ${(b.text || '').replace(/\n/g, ' ')}</p></blockquote>`);
        break;
      case 'image':
        if (b.url) {
          parts.push(`<p style="text-align:center;margin:8px 0;"><img src="${b.url}" alt="${b.caption || '图片'}" style="max-width:100%;border-radius:4px;"/></p>`);
        }
        break;
    }
  }
  let body = parts.join('\n');
  if (!body.includes('#') && !body.includes('@')) {
    body += `\n<p style="font-size:13px;color:#eb7340;margin-top:12px;">#每日分享# #内容创作# #干货分享#</p>`;
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
      messages.push({ level: 'info', field: 'coverImage', message: '建议配图提升曝光率（最多9张）' });
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
    return { title, body, tags, coverImage: content.coverImage, extra: { contentType: 'weibo', style: 'social', ratio: 'square' } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: countBodyChars(output.body),
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
