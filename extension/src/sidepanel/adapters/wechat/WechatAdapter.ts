import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';
import { blocksToPlainText } from '../parserService.js';

const LIMITS = { maxTitle: 64, maxSummary: 120, maxTags: 4, maxBody: 20000 };

function buildBody(blocks: StandardContent['blocks']): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': {
        const tag = b.level === 1 ? 'h2' : `h${(b.level || 2) + 1}`;
        const size = b.level === 1 ? '22px' : '18px';
        const weight = 'bold';
        const color = '#1a1a1a';
        const margin = b.level === 1 ? '28px 0 18px' : '22px 0 14px';
        const extra = b.level === 1 ? 'text-align:center;' : '';
        const border = b.level === 2 ? 'border-bottom:2px solid #3f51b5;padding-bottom:8px;' : '';
        return `<${tag} style="font-size:${size};font-weight:${weight};color:${color};margin:${margin};${extra}${border}">${b.text || ''}</${tag}>`;
      }
      case 'paragraph':
        return `<p style="font-size:15px;line-height:2;color:#333;margin:8px 0;text-align:justify;letter-spacing:1px;">${b.text || ''}</p>`;
      case 'list': {
        const items = (b.items || []).map((item) =>
          `<li style="margin:6px 0;padding-left:4px;font-size:15px;line-height:1.8;color:#333;">${item}</li>`
        ).join('');
        return `<ul style="padding-left:24px;margin:12px 0;list-style-type:disc;">${items}</ul>`;
      }
      case 'quote':
        return `<blockquote style="border-left:3px solid #3f51b5;padding:10px 16px;color:#666;margin:16px 0;background:#f8f9fa;border-radius:0 4px 4px 0;"><p style="font-size:14px;line-height:1.8;margin:0;color:#666;">${b.text || ''}</p></blockquote>`;
      case 'image':
        return `<p style="text-align:center;margin:16px 0;"><img src="${b.url || ''}" alt="${b.caption || ''}" style="max-width:100%;border-radius:4px;display:inline-block;vertical-align:middle;"/></p>`;
      default:
        return '';
    }
  }).join('\n');
}

function makeFormalTitle(title: string): string {
  const prefixes = ['深度解析 | ', '从零到一：', '干货分享 | ', ''];
  if (title.length >= 15) return title;
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${title}`;
}

function wrapBody(body: string): string {
  return `<section style="padding:8px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei UI','Microsoft YaHei',Arial,sans-serif;">${body}</section>`;
}

export const wechatAdapter: PlatformAdapter = {
  platform: 'wechat',
  displayName: '微信公众号',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'warning', field: 'title', message: `标题超过${LIMITS.maxTitle}字限制` });
    }
    if ((content.summary || '').length > LIMITS.maxSummary) {
      messages.push({ level: 'warning', field: 'summary', message: `摘要超过${LIMITS.maxSummary}字` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'info', field: 'tags', message: `公众号建议${LIMITS.maxTags}个以内主题标签` });
    }
    const plainText = blocksToPlainText(content.blocks);
    if (plainText.length > LIMITS.maxBody) {
      messages.push({ level: 'warning', field: 'body', message: `正文超过${LIMITS.maxBody}字，可能被截断` });
    }
    return { valid: true, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = makeFormalTitle(content.title);
    const summary = content.summary || blocksToPlainText(content.blocks).substring(0, 110) + '…';
    const rawBody = buildBody(content.blocks);
    const body = wrapBody(rawBody);
    const tags = content.tags.slice(0, LIMITS.maxTags);

    return { title, summary: summary.substring(0, LIMITS.maxSummary), body, tags,
      coverImage: content.coverImage,
      extra: { contentType: 'article', needsCover: true } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
