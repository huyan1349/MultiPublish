const API_KEY = 'sk-ef508b028884458a8972f038a4e8abfc';
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
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
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || `DeepSeek API ${res.status}`);
  }

  const data = await res.json();
  return (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
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
