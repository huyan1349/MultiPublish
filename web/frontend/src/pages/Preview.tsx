import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { publishToPlatform, isExtensionAvailable } from '../utils/extensionBridge';
import type { PlatformType } from '../adapters/types';

interface ContentData {
  id: string;
  title: string;
  rawMarkdown: string;
  tags: string[];
  coverImage?: string;
}

interface OutputData {
  id: string;
  platform: string;
  platformName: string;
  title: string;
  body: string;
  tags: string[];
  validationMessages: Array<{ level: string; field: string; message: string }>;
  status: string;
}

type PublishState = 'idle' | 'publishing' | 'success' | 'failed';

const platformColors: Record<string, string> = {
  wechat: '#07C160', zhihu: '#0066FF', bilibili: '#FB7299', xiaohongshu: '#FF2442',
};

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentData | null>(null);
  const [outputs, setOutputs] = useState<OutputData[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishStates, setPublishStates] = useState<Map<string, PublishState>>(new Map());
  const [publishMessages, setPublishMessages] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getContent(id), api.getOutputs(id)])
      .then(([c, o]) => { setContent(c); setOutputs(o); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = useCallback(async (output: OutputData) => {
    const platform = output.platform as PlatformType;
    setPublishStates(prev => new Map(prev).set(platform, 'publishing'));

    if (!isExtensionAvailable()) {
      setPublishStates(prev => new Map(prev).set(platform, 'failed'));
      setPublishMessages(prev => new Map(prev).set(platform, '请安装 ContentBridge 扩展'));
      return;
    }

    try {
      const result = await publishToPlatform({
        platform, platformName: output.platformName,
        content: { title: output.title, body: output.body, tags: output.tags },
        autoLayout: true,
      });
      setPublishStates(prev => new Map(prev).set(platform, result.status));
      setPublishMessages(prev => new Map(prev).set(platform, result.message));
    } catch (err) {
      setPublishStates(prev => new Map(prev).set(platform, 'failed'));
      setPublishMessages(prev => new Map(prev).set(platform, err instanceof Error ? err.message : '发布失败'));
    }
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={24} className="text-tx-faint animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-tx-mute text-sm font-mono">NOT FOUND</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[860px] mx-auto px-12 py-16">
        <div className="flex items-center gap-4 mb-12">
          <button onClick={() => navigate('/')} className="text-tx-mute hover:text-tx transition-colors p-1" aria-label="返回首页">
            <ArrowLeft size={17} strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-mono font-bold text-[24px] text-tx tracking-tight truncate">{content.title}</h1>
            <div className="flex gap-1.5 mt-2">
              {content.tags.map((t, i) => (
                <span key={i} className="px-tag">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-card p-6 mb-12">
          <div className="px-label mb-4">ORIGINAL</div>
          <div className="prose prose-sm max-w-none text-tx-dim text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content.rawMarkdown }} />
        </div>

        <div className="px-label mb-5">PLATFORM PREVIEW</div>
        {outputs.length === 0 ? (
          <p className="text-sm text-tx-mute font-mono">暂无适配输出，请先从编辑器保存内容。</p>
        ) : (
          <div className="space-y-3">
            {outputs.map((output) => {
              const state = publishStates.get(output.platform) || 'idle';
              const color = platformColors[output.platform] || '#6b7280';
              return (
                <div key={output.id} className="px-card overflow-hidden">
                  <div className="h-[2px]" style={{ backgroundColor: color }} />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="px-dot" style={{ backgroundColor: color, width: 8, height: 8 }} />
                        <span className="font-mono font-bold text-xs text-tx">{output.platformName}</span>
                        <span className="text-[10px] text-tx-faint">
                          {output.validationMessages.length > 0
                            ? `${output.validationMessages.length} 个提示`
                            : '无校验问题'}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePublish(output)}
                        disabled={state === 'publishing'}
                        className={`px-btn text-[10px] ${
                          state === 'success' ? 'px-btn-secondary' :
                          state === 'failed' ? 'px-btn-danger' :
                          'px-btn-primary'
                        }`}
                      >
                        {state === 'publishing' ? (
                          <><RefreshCw size={12} className="animate-spin" /> PUBLISHING</>
                        ) : state === 'success' ? (
                          <>PUBLISHED</>
                        ) : state === 'failed' ? (
                          <>RETRY</>
                        ) : (
                          <><ExternalLink size={12} /> PUBLISH</>
                        )}
                      </button>
                    </div>

                    {output.validationMessages.length > 0 && (
                      <div className="mb-4 space-y-1">
                        {output.validationMessages.map((m, i) => (
                          <p key={i} className={`text-[11px] font-mono ${
                            m.level === 'error' ? 'text-dot-red' :
                            m.level === 'warning' ? 'text-amber-500' : 'text-tx-dim'
                          }`}>
                            {m.level === 'error' ? '✕' : m.level === 'warning' ? '!' : 'i'} {m.message}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <p className="px-label mb-2">TITLE</p>
                        <p className="text-sm text-tx">{output.title}</p>
                      </div>
                      <div>
                        <p className="px-label mb-2">TAGS</p>
                        <div className="flex flex-wrap gap-1">
                          {output.tags.map((t, i) => (
                            <span key={i} className="px-tag">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="px-label mb-2">BODY</p>
                      <pre className="text-[12px] text-tx-dim bg-px-surface p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto border border-px-border">
                        {output.body}
                      </pre>
                    </div>

                    {publishMessages.has(output.platform) && (
                      <p className={`mt-4 text-xs font-mono ${state === 'success' ? 'text-emerald-600' : 'text-dot-red'}`}>
                        {publishMessages.get(output.platform)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
