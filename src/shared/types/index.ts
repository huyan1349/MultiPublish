/**
 * Platform Adapter 接口定义
 * 新增平台只需实现此接口
 */
export interface PlatformAdapter {
  /** 平台唯一标识 */
  platformId: string
  /** 平台显示名称 */
  displayName: string
  /** 目标网站域名匹配 */
  hostPattern: string

  /** 发布内容到平台 */
  publish(content: PublishPayload): Promise<PublishResult>

  /** 检测用户登录态 */
  detectLoginStatus(): Promise<LoginStatus>

  /** 模拟发布（不实际提交） */
  simulate(content: PublishPayload): Promise<SimulateResult>

  /** 内容校验规则 */
  validate(content: PublishPayload): ValidationResult[]
}

export interface PublishPayload {
  title: string
  content: string        // 适配后的 HTML
  rawMarkdown: string    // 原始 Markdown
  images: ImageItem[]    // 图片列表
  transformTrace: TransformTrace[]  // 转换追踪
}

export interface ImageItem {
  originalUrl: string
  localPath?: string
  base64?: string
  alt: string
}

export interface PublishResult {
  success: boolean
  platformId: string
  url?: string           // 发布后的文章链接
  error?: string
}

export interface LoginStatus {
  isLoggedIn: boolean
  username?: string
  platformId: string
}

export interface SimulateResult {
  platformId: string
  previewHtml: string
  screenshot?: string    // base64 截图
  transformTrace: TransformTrace[]
  warnings: string[]
}

export interface TransformTrace {
  type: 'replace' | 'remove' | 'truncate' | 'reorder' | 'add'
  original: string       // 原始元素/内容描述
  target: string         // 转换后描述
  reason: string         // 转换原因
}

export interface ValidationResult {
  field: string
  passed: boolean
  message: string
  limit?: number
  actual?: number
}

/** 平台内容限制 */
export interface PlatformLimits {
  titleMaxLength: number
  contentMaxLength: number
  maxImages: number
  supportedImageFormats: string[]
  maxImageSize: number   // bytes
}
