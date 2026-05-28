import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';
import { blocksToPlainText } from '../../services/parserService.js';

const LIMITS = { maxTitle: 64, maxSummary: 120, maxTags: 4 };

function buildBody(blocks: StandardContent['blocks']): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': {
        const tag = b.level === 1 ? 'h2' : `h${(b.level || 2) + 1}`;
        return `<${tag} style="font-size:${b.level===1?'22px':'18px'};font-weight:bold;color:#333;margin:24px 0 16px;${b.level===1?'text-align:center;':''}${b.level===2?'border-bottom:2px solid #3f51b5;padding-bottom:8px;':''}">${b.text}</${tag}>`;
      }
      case 'paragraph':
        return `<p style="font-size:15px;line-height:1.75;color:#333;margin:10px 0;text-align:justify;">${b.text}</p>`;
      case 'list': {
        const items = (b.items || []).map((item) => `<li style="margin:4px 0;padding-left:4px;">${item}</li>`).join('');
        return `<ul style="padding-left:24px;margin:10px 0;">${items}</ul>`;
      }
      case 'quote':
        return `<blockquote style="border-left:3px solid #3f51b5;padding:8px 16px;color:#666;margin:16px 0;background:#f8f9fa;"><p style="font-size:14px;line-height:1.6;margin:4px 0;">${b.text}</p></blockquote>`;
      case 'image':
        return `<p style="text-align:center;margin:12px 0;"><img src="${b.url}" alt="${b.caption||''}" style="max-width:100%;border-radius:4px;"/></p>`;
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
    return { valid: true, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = makeFormalTitle(content.title);
    const summary = content.summary || blocksToPlainText(content.blocks).substring(0, 110) + '…';
    const body = buildBody(content.blocks);
    const tags = content.tags.slice(0, LIMITS.maxTags);

    return { title, summary: summary.substring(0, LIMITS.maxSummary), body, tags,
      extra: { contentType: 'article', needsCover: true } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: 20000, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
