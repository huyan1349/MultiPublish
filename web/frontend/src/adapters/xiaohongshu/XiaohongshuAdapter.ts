import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../types';
import { blocksToPlainText } from '../parserService';

const LIMITS = { maxTitle: 20, maxBody: 1000, maxTags: 10 };

function countBodyChars(body: string): number {
  return body.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '').length;
}

const EMOJIS = ['✨', '🔥', '💡', '📌', '🚀', '💪', '🎯', '⭐', '🌟', '✅'];

function makeShortTitle(title: string): string {
  if (title.length <= LIMITS.maxTitle) return title;
  return title.substring(0, LIMITS.maxTitle - 1) + '…';
}

function addEmojiToTitle(title: string): string {
  if (/[\u{1F000}-\u{1FFFF}]/u.test(title)) return title;
  return `${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} ${title}`;
}

function buildNoteBody(blocks: StandardContent['blocks']): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        parts.push(`<p style="font-size:16px;font-weight:bold;margin:12px 0 6px;">📌 ${b.text}</p>`);
        break;
      case 'paragraph': {
        const sentences = (b.text || '').split(/[。！？]/);
        const formatted = sentences.filter(s => s.trim()).map(s => `${s.trim()}。`).join('<br/>');
        parts.push(`<p style="font-size:14px;line-height:1.8;color:#333;margin:6px 0;">${formatted}</p>`);
        break;
      }
      case 'list': {
        const items = (b.items || []).map(item =>
          `<li style="margin:3px 0;padding-left:4px;">${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} ${item}</li>`
        ).join('');
        parts.push(`<ul style="padding-left:20px;margin:6px 0;">${items}</ul>`);
        break;
      }
      case 'quote':
        parts.push(`<blockquote style="border-left:3px solid #FF2442;padding:6px 12px;color:#666;margin:8px 0;background:#fff5f7;"><p style="font-size:13px;line-height:1.6;margin:0;">💬 ${(b.text || '').replace(/\n/g, ' ')}</p></blockquote>`);
        break;
      case 'image':
        if (b.url) {
          parts.push(`<p style="text-align:center;margin:8px 0;"><img src="${b.url}" alt="${b.caption || '图片'}" style="max-width:100%;border-radius:4px;"/></p>`);
        }
        break;
    }
  }
  let body = parts.join('\n');
  if (!body.includes('#')) {
    body += `\n<p style="font-size:13px;color:#999;margin-top:12px;">#内容创作 #效率工具 #自媒体 #干货分享</p>`;
  }
  return body;
}

export const xiaohongshuAdapter: PlatformAdapter = {
  platform: 'xiaohongshu',
  displayName: '小红书',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'error', field: 'title', message: `小红书标题不能超过${LIMITS.maxTitle}字` });
    }
    const plainText = blocksToPlainText(content.blocks);
    if (plainText.length > LIMITS.maxBody) {
      messages.push({ level: 'warning', field: 'body', message: `正文超过${LIMITS.maxBody}字，将被截断` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'info', field: 'tags', message: `标签最多${LIMITS.maxTags}个` });
    }
    if (!content.coverImage) {
      messages.push({ level: 'info', field: 'coverImage', message: '建议上传3:4竖版封面图' });
    }
    return { valid: true, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = addEmojiToTitle(makeShortTitle(content.title));
    const body = buildNoteBody(content.blocks);
    const tags = content.tags.slice(0, LIMITS.maxTags).map((t) => t.startsWith('#') ? t : `#${t}`);
    return { title, body, tags, coverImage: content.coverImage, extra: { contentType: 'note', style: 'casual', ratio: '3:4' } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: countBodyChars(output.body),
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
