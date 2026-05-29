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
        <RefreshCw size={16} className="text-tx-faint animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="font-mono text-xs text-tx-mute">NOT FOUND</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-10 py-14">
        <div className="flex items-center gap-3 mb-10">
          <button onClick={() => navigate('/')} className="text-tx-mute hover:text-tx transition-colors p-1">
            <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-mono font-bold text-lg text-tx tracking-wide truncate">{content.title}</h1>
            <div className="flex gap-1.5 mt-2">
              {content.tags.map((t, i) => (
                <span key={i} className="font-mono text-[9px] text-tx-faint bg-px-surface px-1.5 py-0.5">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-card p-5 mb-10">
          <div className="px-label mb-3">RAW CONTENT</div>
          <div className="text-sm text-tx-dim leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content.rawMarkdown }} />
        </div>

        <div className="px-label mb-4">ADAPTED OUTPUT</div>
        {outputs.length === 0 ? (
          <p className="font-mono text-[11px] text-tx-mute">NO OUTPUT — SAVE FROM EDITOR FIRST</p>
        ) : (
          <div className="space-y-2">
            {outputs.map((output) => {
              const state = publishStates.get(output.platform) || 'idle';
              const color = platformColors[output.platform] || '#555555';
              return (
                <div key={output.id} className="px-card overflow-hidden">
                  <div className="h-px" style={{ backgroundColor: color }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-[6px] h-[6px]" style={{ backgroundColor: color }} />
                        <span className="font-mono font-bold text-[11px] text-tx tracking-wide">{output.platformName}</span>
                        {output.validationMessages.length > 0 && (
                          <span className="font-mono text-[9px] text-tx-faint">{output.validationMessages.length} ALERTS</span>
                        )}
                      </div>
                      <button
                        onClick={() => handlePublish(output)}
                        disabled={state === 'publishing'}
                        className={`px-btn text-[9px] ${
                          state === 'success' ? 'border-emerald-500 text-emerald-500' :
                          state === 'failed' ? 'border-dot-red text-dot-red' :
                          'px-btn-primary'
                        }`}
                      >
                        {state === 'publishing' ? (
                          <><RefreshCw size={11} className="animate-spin" /> SENDING</>
                        ) : state === 'success' ? (
                          <>SENT</>
                        ) : state === 'failed' ? (
                          <>RETRY</>
                        ) : (
                          <><ExternalLink size={11} /> PUBLISH</>
                        )}
                      </button>
                    </div>

                    {output.validationMessages.length > 0 && (
                      <div className="mb-3 space-y-0.5 border-l border-px-border pl-3">
                        {output.validationMessages.map((m, i) => (
                          <p key={i} className={`font-mono text-[10px] ${
                            m.level === 'error' ? 'text-dot-red' :
                            m.level === 'warning' ? 'text-amber-500' : 'text-tx-dim'
                          }`}>
                            [{m.level.toUpperCase()}] {m.message}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="font-mono text-[9px] text-tx-faint">TITLE</span>
                        <p className="font-mono text-xs text-tx mt-0.5">{output.title}</p>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] text-tx-faint">TAGS</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {output.tags.map((t, i) => (
                            <span key={i} className="font-mono text-[9px] text-tx-dim bg-px-surface px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-tx-faint">BODY</span>
                      <pre className="font-mono text-[11px] text-tx-dim bg-px-surface p-3 mt-0.5 leading-relaxed max-h-40 overflow-y-auto border border-px-border-subtle whitespace-pre-wrap">
                        {output.body}
                      </pre>
                    </div>

                    {publishMessages.has(output.platform) && (
                      <p className={`mt-3 font-mono text-[10px] ${state === 'success' ? 'text-emerald-500' : 'text-dot-red'}`}>
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
