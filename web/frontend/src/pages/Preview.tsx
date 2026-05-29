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
      .then(([c, o]) => {
        setContent(c);
        setOutputs(o);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = useCallback(async (output: OutputData) => {
    const platform = output.platform as PlatformType;
    setPublishStates(prev => new Map(prev).set(platform, 'publishing'));

    if (!isExtensionAvailable()) {
      setPublishStates(prev => new Map(prev).set(platform, 'failed'));
      setPublishMessages(prev => new Map(prev).set(platform, '请安装 ContentBridge 扩展并在 Chrome 中打开此页面'));
      return;
    }

    try {
      const result = await publishToPlatform({
        platform,
        platformName: output.platformName,
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
        <div className="text-center">
          <RefreshCw size={28} className="mx-auto text-ink-muted animate-spin mb-3" />
          <p className="text-sm text-ink-muted">加载中…</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ink-muted text-sm">文章不存在</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-ink-muted hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-ink truncate">{content.title}</h1>
            <div className="flex gap-1.5 mt-1.5">
              {content.tags.map((t, i) => (
                <span key={i} className="text-xs text-ink-muted bg-surface px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Source Content */}
        <div className="card p-5 mb-8">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">原始内容</h2>
          <div className="prose prose-sm max-w-none text-ink-secondary text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content.rawMarkdown }} />
        </div>

        {/* Platform Outputs */}
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">平台适配预览</h2>
        {outputs.length === 0 ? (
          <p className="text-sm text-ink-muted">暂无适配输出，请先从编辑器保存内容。</p>
        ) : (
          <div className="space-y-3">
            {outputs.map((output) => {
              const state = publishStates.get(output.platform) || 'idle';
              return (
                <div key={output.id} className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold text-xs">
                        {output.platformName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-ink">{output.platformName}</span>
                        <span className="text-xs text-ink-muted ml-2">
                          {output.validationMessages.length > 0
                            ? `${output.validationMessages.length} 个提示`
                            : '无校验问题'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePublish(output)}
                      disabled={state === 'publishing'}
                      className={`btn text-xs ${
                        state === 'success' ? 'bg-emerald-500 text-white' :
                        state === 'failed' ? 'bg-red-500 text-white' :
                        'btn-primary'
                      }`}
                    >
                      {state === 'publishing' ? (
                        <><RefreshCw size={13} className="animate-spin" /> 发布中</>
                      ) : state === 'success' ? (
                        <>已发布</>
                      ) : state === 'failed' ? (
                        <>重试</>
                      ) : (
                        <><ExternalLink size={13} /> 发布</>
                      )}
                    </button>
                  </div>

                  {/* Validation */}
                  {output.validationMessages.length > 0 && (
                    <div className="mb-3 space-y-0.5">
                      {output.validationMessages.map((m, i) => (
                        <p key={i} className={`text-xs ${
                          m.level === 'error' ? 'text-red-500' :
                          m.level === 'warning' ? 'text-amber-500' : 'text-blue-500'
                        }`}>
                          {m.level === 'error' ? '⚠' : m.level === 'warning' ? '⚡' : 'ℹ'} {m.message}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Output Preview */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-ink-muted mb-1">标题</p>
                      <p className="text-sm text-ink font-medium">{output.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted mb-1">标签</p>
                      <div className="flex flex-wrap gap-1">
                        {output.tags.map((t, i) => (
                          <span key={i} className="text-xs bg-surface text-ink-muted px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-ink-muted mb-1">正文</p>
                    <pre className="text-xs text-ink-secondary bg-surface rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                      {output.body}
                    </pre>
                  </div>

                  {/* Publish message */}
                  {publishMessages.has(output.platform) && (
                    <p className={`mt-3 text-xs ${state === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {publishMessages.get(output.platform)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
