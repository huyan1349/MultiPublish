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
  wechat: '#6f846d',
  zhihu: '#6d8aa6',
  bilibili: '#50624f',
  xiaohongshu: '#8ba287',
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
      setPublishMessages((prev) => new Map(prev).set(platform, '请先安装并启用 MultiPublish 扩展'));
      return;
    }

    try {
      const result = await publishToPlatform({
        platform,
        platformName: output.platformName,
        content: { title: output.title, body: output.body, tags: output.tags },
        autoLayout: true,
      });
      // save publish record
      if (id) {
        api.createPublishRecord({
          contentId: id,
          platform,
          platformName: output.platformName,
          status: result.status,
          message: result.message,
          mockUrl: result.mockUrl,
        }).catch(() => {});
      }
      setPublishStates((prev) => new Map(prev).set(platform, result.status));
      setPublishMessages((prev) => new Map(prev).set(platform, result.message));
    } catch (err) {
      const message = err instanceof Error ? err.message : '发布失败';
      if (id) {
        api.createPublishRecord({
          contentId: id,
          platform,
          platformName: output.platformName,
          status: 'failed',
          message,
        }).catch(() => {});
      }
      setPublishStates((prev) => new Map(prev).set(platform, 'failed'));
      setPublishMessages((prev) => new Map(prev).set(platform, message));
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
        <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.2em] text-[var(--ink-faint)]">没有找到对应稿件</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="px-card px-paper p-6 md:p-7">
          <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px] xl:items-center">
            <div className="space-y-3">
              <button onClick={() => navigate('/')} className="px-btn-ghost -ml-3 w-fit">
                <ArrowLeft size={14} />
                返回工作台
              </button>
              <div className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.7)] p-4">
                <div className="px-label mb-3">稿件信息</div>
                <div className="space-y-2 text-[13px] leading-6 text-[var(--ink-soft)]">
                  <div>适配平台：{outputs.length} 个</div>
                  <div>标签数量：{content.tags.length} 个</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                预览与发布
              </div>
              <div className="hidden h-10 w-px bg-[rgba(49,56,45,0.12)] xl:block" />
              <div className="hidden flex-wrap gap-2 xl:flex">
                <span className="px-tag">原稿</span>
                <span className="px-tag">平台结果</span>
                <span className="px-tag">真实发送</span>
              </div>
            </div>

            <div className="rounded-[26px] border border-[rgba(49,56,45,0.12)] bg-[rgba(244,249,243,0.9)] p-5">
              <div className="px-label mb-4">目标平台</div>
              <div className="space-y-3">
                {outputs.map((output) => (
                  <div key={output.id} className="flex items-center justify-between text-[12px] text-[var(--ink-soft)]">
                    <div className="flex items-center gap-3">
                      <div className="px-dot" style={{ backgroundColor: platformColors[output.platform] }} />
                      <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink)]">
                        {output.platformName}
                      </span>
                    </div>
                    <span>{output.validationMessages.length > 0 ? `${output.validationMessages.length} 条提示` : '可发布'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="px-card px-paper p-6 md:p-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="px-label mb-3">原稿</div>
                <h2 className="font-['Cormorant_Garamond'] text-[42px] leading-none tracking-[-0.06em] text-[var(--ink)]">
                  {content.title}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag, index) => (
                  <span key={index} className="px-tag">{tag}</span>
                ))}
              </div>
            </div>
            <div
              className="px-prose rounded-[28px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.72)] p-6 md:p-8"
              dangerouslySetInnerHTML={{ __html: content.rawMarkdown }}
            />
          </div>

          <div className="grid gap-4">
            {outputs.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-[rgba(49,56,45,0.18)] bg-[rgba(255,255,255,0.62)] px-8 py-20 text-center">
                <p className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.2em] text-[var(--ink-faint)]">
                  还没有平台适配结果
                </p>
                <p className="mx-auto mt-3 max-w-[300px] text-[14px] leading-7 text-[var(--ink-soft)]">
                  请先从编辑页保存，再回到这里查看平台输出。
                </p>
              </div>
            ) : (
              outputs.map((output) => {
                const state = publishStates.get(output.platform) || 'idle';
                const color = platformColors[output.platform] || '#6b7280';

                return (
                  <div key={output.id} className="px-card px-paper overflow-hidden">
                    <div className="h-[3px]" style={{ backgroundColor: color }} />
                    <div className="p-6">
                      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="mb-3 flex items-center gap-3">
                            <div className="px-dot" style={{ backgroundColor: color, width: 8, height: 8 }} />
                            <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink)]">
                              {output.platformName}
                            </span>
                            <span className="text-[11px] text-[var(--ink-faint)]">
                              {output.validationMessages.length > 0 ? `${output.validationMessages.length} 条提示` : '无校验问题'}
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
                              正在发布
                            </>
                          ) : state === 'success' ? (
                            '已发布'
                          ) : state === 'failed' ? (
                            '重新发布'
                          ) : (
                            <>
                              <ExternalLink size={13} />
                              发布到平台
                            </>
                          )}
                        </button>
                      </div>

                      {output.validationMessages.length > 0 && (
                        <div className="mb-5 rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.66)] p-4">
                          <div className="px-label mb-3">校验提示</div>
                          <div className="space-y-2 text-[12px] leading-6 text-[var(--ink-soft)]">
                            {output.validationMessages.map((message, index) => (
                              <p key={index}>
                                <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-faint)]">
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
                        <div className="rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.68)] p-4">
                          <div className="px-label mb-3">标签</div>
                          <div className="flex flex-wrap gap-2">
                            {output.tags.map((tag, index) => (
                              <span key={index} className="px-tag">{tag}</span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.68)] p-4">
                          <div className="px-label mb-3">正文预览</div>
                          <pre className="max-h-[280px] overflow-y-auto whitespace-pre-wrap font-['IBM_Plex_Mono'] text-[11px] leading-7 text-[var(--ink-soft)] scrollbar-thin">
                            {output.body}
                          </pre>
                        </div>
                      </div>

                      {publishMessages.has(output.platform) && (
                        <div className={`mt-5 rounded-[22px] px-4 py-3 text-[12px] leading-6 ${
                          state === 'success'
                            ? 'border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]'
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
