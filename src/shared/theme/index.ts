/**
 * Theme 配置定义
 * 支持嵌套选择器：'blockquote p', 'pre code', 'li p' 等
 */
export interface ThemeConfig {
  id: string
  name: string
  platformId: string
  styles: Record<string, string>  // CSS 选择器 → 行内样式字符串
}

/**
 * 微信公众号默认主题
 */
export const wechatDefaultTheme: ThemeConfig = {
  id: 'wechat-default',
  name: '微信经典蓝',
  platformId: 'wechat',
  styles: {
    'h1': 'font-size: 22px; font-weight: bold; color: #1a1a1a; margin: 24px 0 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;',
    'h2': 'font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 20px 0 12px;',
    'h3': 'font-size: 16px; font-weight: bold; color: #333; margin: 16px 0 8px;',
    'p': 'font-size: 15px; color: #333; line-height: 1.8; margin: 8px 0;',
    'blockquote': 'border-left: 3px solid #3b82f6; padding: 12px 16px; margin: 16px 0; background: #f0f7ff; border-radius: 0 4px 4px 0;',
    'blockquote p': 'font-size: 14px; color: #555; line-height: 1.7;',
    'pre': 'background: #1e293b; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 16px 0;',
    'pre code': 'font-size: 13px; color: #e2e8f0; font-family: "Fira Code", "JetBrains Mono", monospace;',
    'code': 'background: #f1f5f9; color: #e11d48; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: "Fira Code", monospace;',
    'li p': 'font-size: 15px; color: #333; line-height: 1.8; margin: 4px 0;',
    'ol li': 'list-style: decimal; padding-left: 20px; margin: 4px 0;',
    'ul li': 'list-style: disc; padding-left: 20px; margin: 4px 0;',
    'img': 'max-width: 100%; border-radius: 6px; margin: 12px auto; display: block;',
    'table': 'width: 100%; border-collapse: collapse; margin: 16px 0;',
    'th': 'background: #3b82f6; color: white; padding: 10px 14px; text-align: left; font-size: 14px;',
    'td': 'border-bottom: 1px solid #e5e7eb; padding: 10px 14px; font-size: 14px;',
    'a': 'color: #3b82f6; text-decoration: none; border-bottom: 1px solid #93c5fd;',
  }
}

/**
 * 知乎默认主题
 */
export const zhihuDefaultTheme: ThemeConfig = {
  id: 'zhihu-default',
  name: '知乎简洁风',
  platformId: 'zhihu',
  styles: {
    'h1': 'font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 24px 0 12px;',
    'h2': 'font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 20px 0 10px;',
    'p': 'font-size: 15px; color: #333; line-height: 1.8; margin: 8px 0;',
    'blockquote': 'border-left: 3px solid #056de8; padding: 8px 16px; margin: 12px 0; color: #666;',
    'pre': 'background: #f6f8fa; padding: 14px; border-radius: 4px; overflow-x: auto;',
    'code': 'background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 13px;',
    'img': 'max-width: 100%; margin: 8px 0;',
  }
}
