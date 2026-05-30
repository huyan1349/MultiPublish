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
  wechat: '#07C160',
  zhihu: '#0066FF',
  bilibili: '#FB7299',
  xiaohongshu: '#FF2442',
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
      .then(([fetchedContent, fetchedOutputs]) => {
        setContent(fetchedContent);
        setOutputs(fetchedOutputs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = useCallback(async (output: OutputData) => {
    const platform = output.platform as PlatformType;
    setPublishStates((prev) => new Map(prev).set(platform, 'publishing'));

    if (!isExtensionAvailable()) {
      setPublishStates((prev) => new Map(prev).set(platform, 'failed'));
      setPublishMessages((prev) => new Map(prev).set(platform, '请安装 MultiPublish 扩展'));
      return;
    }

    try {
      const result = await publishToPlatform({
        platform,
        platformName: output.platformName,
        content: { title: output.title, body: output.body, tags: output.tags },
        autoLayout: true,
      });
      setPublishStates((prev) => new Map(prev).set(platform, result.status));
      setPublishMessages((prev) => new Map(prev).set(platform, result.message));
    } catch (err) {
      setPublishStates((prev) => new Map(prev).set(platform, 'failed'));
      setPublishMessages((prev) => new Map(prev).set(platform, err instanceof Error ? err.message : '发布失败'));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw size={26} className="animate-spin text-[var(--ink-faint)]" strokeWidth={1.5} />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">Draft not found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <section className="px-card px-paper overflow-hidden p-6 md:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <button onClick={() => navigate('/')} className="px-btn-ghost -ml-3 w-fit">
                <ArrowLeft size={14} />
                Back to overview
              </button>

              <div className="space-y-4">
                <div className="px-label">Preview archive</div>
                <h1 className="font-['Cormorant_Garamond'] text-[62px] leading-[0.9] tracking-[-0.07em] text-[var(--ink)]">
                  {content.title}
                </h1>
                <p className="max-w-[720px] text-[14px] leading-7 text-[var(--ink-soft)]">
                  Review the original manuscript, compare every transformed output, then send the final versions through the extension when you are ready.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag, index) => (
                  <span key={index} className="px-tag">{tag}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 self-start">
              <div className="px-metric">
                <span className="px-metric-label">Platform outputs</span>
                <span className="px-metric-value">{outputs.length}</span>
              </div>
              <div className="rounded-[28px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.66)] p-5">
                <div className="px-label mb-3">Routing</div>
                <div className="space-y-3">
                  {outputs.map((output) => (
                    <div key={output.id} className="flex items-center justify-between text-[12px] text-[var(--ink-soft)]">
                      <div className="flex items-center gap-3">
                        <div className="px-dot" style={{ backgroundColor: platformColors[output.platform] }} />
                        <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">
                          {output.platformName}
                        </span>
                      </div>
                      <span>{output.validationMessages.length > 0 ? `${output.validationMessages.length} notes` : 'Ready'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="px-card px-paper p-6 md:p-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="px-label mb-3">Original manuscript</div>
                <h2 className="font-['Cormorant_Garamond'] text-[44px] leading-none tracking-[-0.06em] text-[var(--ink)]">
                  Source draft
                </h2>
              </div>
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Editable in writing desk
              </span>
            </div>
            <div
              className="px-prose rounded-[28px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.7)] p-6 md:p-8"
              dangerouslySetInnerHTML={{ __html: content.rawMarkdown }}
            />
          </div>

          <div className="grid gap-4">
            {outputs.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-[rgba(120,104,89,0.18)] bg-[rgba(255,252,247,0.62)] px-8 py-20 text-center">
                <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                  No adapted outputs
                </p>
                <p className="mx-auto mt-3 max-w-[300px] text-[14px] leading-7 text-[var(--ink-soft)]">
                  Save this draft from the editor first, then come back to inspect every platform version.
                </p>
              </div>
            ) : (
              outputs.map((output) => {
                const state = publishStates.get(output.platform) || 'idle';
                const color = platformColors[output.platform] || '#6b7280';

                return (
                  <div key={output.id} className="px-card px-paper overflow-hidden">
                    <div className="h-[3px]" style={{ backgroundColor: color }} />
                    <div className="p-6 md:p-7">
                      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="mb-3 flex items-center gap-3">
                            <div className="px-dot" style={{ backgroundColor: color, width: 8, height: 8 }} />
                            <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">
                              {output.platformName}
                            </span>
                            <span className="text-[11px] text-[var(--ink-faint)]">
                              {output.validationMessages.length > 0 ? `${output.validationMessages.length} notes` : 'No warnings'}
                            </span>
                          </div>
                          <h3 className="font-['Cormorant_Garamond'] text-[38px] leading-[0.94] tracking-[-0.05em] text-[var(--ink)]">
                            {output.title}
                          </h3>
                        </div>

                        <button
                          onClick={() => handlePublish(output)}
                          disabled={state === 'publishing'}
                          className={state === 'success' ? 'px-btn-secondary' : state === 'failed' ? 'px-btn-danger' : 'px-btn-primary'}
                        >
                          {state === 'publishing' ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              Publishing
                            </>
                          ) : state === 'success' ? (
                            'Published'
                          ) : state === 'failed' ? (
                            'Retry publish'
                          ) : (
                            <>
                              <ExternalLink size={13} />
                              Publish now
                            </>
                          )}
                        </button>
                      </div>

                      {output.validationMessages.length > 0 && (
                        <div className="mb-5 rounded-[24px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.68)] p-4">
                          <div className="px-label mb-3">Validation notes</div>
                          <div className="space-y-2 text-[12px] leading-6 text-[var(--ink-soft)]">
                            {output.validationMessages.map((message, index) => (
                              <p key={index}>
                                <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                                  {message.level}
                                </span>
                                {' '}
                                {message.message}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="rounded-[24px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.62)] p-4">
                          <div className="px-label mb-3">Tags</div>
                          <div className="flex flex-wrap gap-2">
                            {output.tags.map((tag, index) => (
                              <span key={index} className="px-tag">{tag}</span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.62)] p-4">
                          <div className="px-label mb-3">Body</div>
                          <pre className="max-h-[280px] overflow-y-auto whitespace-pre-wrap font-['IBM_Plex_Mono'] text-[11px] leading-7 text-[var(--ink-soft)] scrollbar-thin">
                            {output.body}
                          </pre>
                        </div>
                      </div>

                      {publishMessages.has(output.platform) && (
                        <div className={`mt-5 rounded-[22px] px-4 py-3 text-[12px] leading-6 ${
                          state === 'success'
                            ? 'border border-emerald-300/40 bg-emerald-100/55 text-emerald-700'
                            : 'border border-red-300/40 bg-red-100/60 text-red-700'
                        }`}>
                          {publishMessages.get(output.platform)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
