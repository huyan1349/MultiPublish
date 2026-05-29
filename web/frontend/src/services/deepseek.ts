const API_KEY = 'sk-ef508b028884458a8972f038a4e8abfc';
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const TIMEOUT_MS = 30000;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `DeepSeek API ${res.status}`);
    }

    const data = await res.json();
    return (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI 请求超时（30s），请稍后重试');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonResponse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export type PlatformStyle = 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu';

export interface BeautifyContentInput {
  platform: PlatformStyle;
  platformName: string;
  title: string;
  htmlContent: string;
  tags: string[];
}

export interface BeautifyContentResult {
  title: string;
  htmlBody: string;
  tags: string[];
}

const PLATFORM_SYSTEM_PROMPTS: Record<PlatformStyle, string> = {
  wechat: `你是一位资深公众号编辑。请将用户的内容改写为微信公众号风格，要求：
1. 标题：正式、有深度、可适当使用问号或感叹号增强吸引力，15字以内
2. 正文风格：正式严谨、段落清晰、逻辑递进，每段3-5句话
3. 关键短语用<strong>加粗</strong>突出
4. 适当使用小标题<h3>分段，增强可读性
5. 结尾添加引导关注的句子，如"关注我，获取更多深度内容"
6. 保持HTML标签格式输出，不要丢失原有的标签结构
7. 标签：3-5个与内容相关的热门标签`,

  zhihu: `你是一位知乎高赞答主。请将用户的内容改写为知乎专栏风格，要求：
1. 标题：理性、专业、可带有数据或观点倾向，20字以内
2. 正文风格：逻辑严密、数据支撑、专业术语、理性分析
3. 适当引用权威来源或数据，使用"据XX统计"、"研究表明"等表达
4. 使用<h3>小标题组织论点，每个论点配以论据
5. 适当使用<blockquote>引用重要观点
6. 保持HTML标签格式输出
7. 标签：3-5个专业领域标签`,

  bilibili: `你是一位B站UP主。请将用户的内容改写为B站动态/专栏风格，要求：
1. 标题：轻松活泼、带梗、可使用"！"增强语气，20字以内
2. 正文风格：轻松活泼、二次元用语、弹幕感、短句为主
3. 适当使用emoji点缀（🔥✨🎮💡👍等），但不要过度
4. 用短段落、换行增强节奏感
5. 可以使用"家人们"、"这波"、"绝了"等B站常用表达
6. 保持HTML标签格式输出
7. 标签：3-5个B站热门标签`,

  xiaohongshu: `你是一位小红书博主。请将用户的内容改写为小红书笔记风格，要求：
1. 标题：种草感、吸睛、短小精悍，15字以内，可使用emoji开头
2. 正文风格：种草感、清单体、emoji丰富、短句为主
3. 大量使用emoji（✨🔥💕🌟📌💡等），每段1-2个
4. 使用数字列表"1️⃣2️⃣3️⃣"或"①②③"组织内容
5. 结尾添加话题引导，如"姐妹们觉得怎么样？评论区告诉我～"
6. 保持HTML标签格式输出
7. 标签：5-8个小红书热门话题标签（不带#号）`,
};

export async function beautifyContentForPlatform(input: BeautifyContentInput): Promise<BeautifyContentResult> {
  const systemPrompt = PLATFORM_SYSTEM_PROMPTS[input.platform] || PLATFORM_SYSTEM_PROMPTS.wechat;

  const plainText = input.htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const raw = await chat([
    {
      role: 'system',
      content: `${systemPrompt}\n\n请严格按以下JSON格式返回，不要包含任何其他文字：\n{"title":"改写后的标题","htmlBody":"改写后的HTML正文","tags":["标签1","标签2"]}`,
    },
    {
      role: 'user',
      content: `原标题：${input.title}\n\n原正文（HTML）：${input.htmlContent}\n\n原正文（纯文本参考）：${plainText.slice(0, 2000)}\n\n原标签：${input.tags.join('、')}\n\n请改写为${input.platformName}风格，返回JSON。`,
    },
  ], 0.7);

  return parseJsonResponse<BeautifyContentResult>(raw, {
    title: input.title,
    htmlBody: input.htmlContent,
    tags: input.tags,
  });
}

export interface BeautifyOptions {
  platform: string;
  platformName: string;
  title: string;
  body: string;
  tags: string[];
}

export async function beautifyForPlatform(opts: BeautifyOptions): Promise<{
  title: string;
  body: string;
  tags: string[];
}> {
  const platformStyles: Record<string, string> = {
    wechat: '公众号风格：正式、深度、段落清晰、适当加粗关键词、结尾引导关注',
    zhihu: '知乎风格：逻辑严密、数据支撑、专业术语、理性分析、适当引用',
    bilibili: 'B站风格：轻松活泼、二次元用语、弹幕感、短句为主、emoji点缀',
    xiaohongshu: '小红书风格：种草感、清单体、emoji丰富、短标题吸睛、话题感强',
  };

  const style = platformStyles[opts.platform] || '通用风格：清晰简洁';

  const raw = await chat([
    {
      role: 'system',
      content: `你是一个专业的内容编辑，擅长将同一篇内容适配为不同平台的风格。请按照${style}来改写内容。只返回JSON，不要任何其他文字。返回格式：{"title":"改写后的标题","body":"改写后的正文","tags":["标签1","标签2"]}`,
    },
    {
      role: 'user',
      content: `原标题：${opts.title}\n\n原正文：${opts.body}\n\n原标签：${opts.tags.join('、')}\n\n请改写为${opts.platformName}风格。`,
    },
  ], 0.7);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { title: opts.title, body: raw, tags: opts.tags };
  }
}

export async function generateInspiration(topic?: string): Promise<{
  title: string;
  outline: string;
  tags: string[];
  style: string;
}> {
  const topicHint = topic ? `关于「${topic}」这个话题` : '任意热门话题';

  const raw = await chat([
    {
      role: 'system',
      content: '你是一个创意内容策划师。为用户生成一个有吸引力的内容灵感。只返回JSON，不要任何其他文字。返回格式：{"title":"建议标题","outline":"内容大纲（3-5个要点，用换行分隔）","tags":["标签1","标签2","标签3"],"style":"推荐风格（如：深度分析/种草推荐/教程攻略/观点评论）"}',
    },
    {
      role: 'user',
      content: `请给我${topicHint}的内容灵感。`,
    },
  ], 0.9);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { title: '灵感生成失败', outline: raw, tags: [], style: '自由风格' };
  }
}

export async function generateTitle(body: string): Promise<string[]> {
  const raw = await chat([
    {
      role: 'system',
      content: '你是一个标题专家。根据正文内容生成5个吸引人的标题。只返回JSON数组，不要任何其他文字。如：["标题1","标题2","标题3","标题4","标题5"]',
    },
    {
      role: 'user',
      content: `正文：${body.slice(0, 500)}`,
    },
  ], 0.8);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [body.slice(0, 30) + '…'];
  }
}

export async function suggestTags(title: string, body: string): Promise<string[]> {
  const raw = await chat([
    {
      role: 'system',
      content: '你是一个标签专家。根据标题和正文，推荐5-8个适合的标签。只返回JSON数组，不要任何其他文字。如：["标签1","标签2"]',
    },
    {
      role: 'user',
      content: `标题：${title}\n正文：${body.slice(0, 300)}`,
    },
  ], 0.5);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
