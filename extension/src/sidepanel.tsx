import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle, ChevronRight,
  ClipboardCopy, Download, Edit3, FileText, Github, LayoutDashboard, Loader2,
  PenLine, RefreshCw, Rocket, Save, Send, Settings, Sparkles, X, XCircle,
} from 'lucide-react';
import { useContentStore } from './sidepanel/stores/contentStore';
import { parseMarkdownToBlocks } from './sidepanel/adapters/parserService';
import { getAdapter } from './sidepanel/adapters/AdapterFactory';
import TiptapEditor, { getResolvedDataUrl, waitForDataUrls } from './sidepanel/components/TiptapEditor';
import { createZipBlob, downloadBlob, type ZipFile } from './sidepanel/utils/exportZip';
import type { ImagePayload, PlatformOutputDraft, PlatformType, PublishResult, StandardContent, ValidationMessage } from './shared/types';
import './sidepanel/styles/index.css';

type Page = 'dashboard' | 'editor' | 'preview' | 'records' | 'settings';
type Notice = { type: 'success' | 'error' | 'info'; message: string };

type PreviewOutput = PlatformOutputDraft & {
  platform: PlatformType; platformName: string; outputId: string;
  validationMessages?: ValidationMessage[];
};

type EditingOutput = {
  outputId: string; title: string; summary: string;
  body: string; tags: string;
};

const PLATFORMS: Array<{ id: PlatformType; name: string; color: string; desc: string }> = [
  { id: 'wechat', name: '公众号', color: '#07C160', desc: '正式长文，层次分明' },
  { id: 'zhihu', name: '知乎', color: '#448AFF', desc: '逻辑分析，结论先行' },
  { id: 'bilibili', name: 'B站', color: '#FB7299', desc: '图文专栏，标签驱动' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF5A5F', desc: '种草风格，短小精炼' },
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function stripHtml(v: string) { return v.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(); }
function parseTags(v: string) { return v.split(/[,，]/).map((t) => t.trim()).filter(Boolean); }
function sanitizeFilename(v: string) {
  return (v || 'untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '-').slice(0, 48) || 'untitled';
}
function timestampSlug() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function escapeHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/** 清掉正文中 data:image + blob: 图片引用，让 textarea 可编辑 */
function stripDataUrlImages(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/gi, '[图片]')
    .replace(/!\[[^\]]*\]\(blob:[^)]+\)/gi, '[图片]')
    .replace(/<img[^>]*src\s*=\s*["'](?:data:image|blob):[^"']*["'][^>]*\/?>/gi, '[图片]');
}

/** 从编辑器 HTML 直接提取 <img> 标签，在预览中展示 */
function renderPreviewImages(rawHtml: string): ReactNode {
  const srcs = extractImageSrcs(rawHtml);
  if (srcs.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      {srcs.map((src, i) => (
        <img key={i} src={src} alt={`图片${i + 1}`}
          style={{ maxWidth: 120, maxHeight: 120, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'cover' }} />
      ))}
    </div>
  );
}

/** 预览正文渲染：Markdown 图片语法 → <img>，保留 blob/data URL */
function renderPreviewBody(body: string): string {
  return body
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0" />')
    .replace(/\n/g, '<br>');
}

function outputToHtml(output: PreviewOutput) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(output.title)}</title><style>body{max-width:760px;margin:32px auto;padding:0 20px;font-family:system-ui,-apple-system,sans-serif;line-height:1.75;color:#202124}h1{font-size:26px;line-height:1.35}.summary{color:#5f6368}.tags{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 24px}.tag{padding:3px 10px;border-radius:999px;background:#f1f3f4;font-size:12px;color:#5f6368}</style></head><body><h1>${escapeHtml(output.title)}</h1>${output.summary ? `<p class="summary">${escapeHtml(output.summary)}</p>` : ''}<div class="tags">${output.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div><main>${output.body.replace(/\n/g, '<br />')}</main></body></html>`;
}
function dataUrlToBlob(dataUrl: string) {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** 从 HTML 提取所有 <img> 的 src，返回去重列表 */
function extractImageSrcs(html: string): string[] {
  const srcs: string[] = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('img').forEach((img) => {
    const s = img.getAttribute('src');
    if (s) srcs.push(s);
  });
  return [...new Set(srcs)];
}

/** 等待图片后台转换完成，然后把 outputs 中所有 blob URL 替换为 data URL */
async function resolveBlobUrlsInOutputs(outputs: PreviewOutput[]): Promise<PreviewOutput[]> {
  // 收集所有 blob URL
  const blobUrls = new Set<string>();
  const blobRe = /blob:[\w-]+:\/\/[^)\s"']+/g;
  for (const o of outputs) {
    for (const m of o.body.matchAll(blobRe)) blobUrls.add(m[0]);
  }
  if (blobUrls.size === 0) return outputs;

  // 等待后台 FileReader 全部转换完成
  await waitForDataUrls([...blobUrls]);

  // 替换
  return outputs.map((o) => ({
    ...o,
    body: replaceBlobUrlsWithData(o.body),
  }));
}

function replaceBlobUrlsWithData(text: string): string {
  return text.replace(/blob:[\w-]+:\/\/[^)\s"']+/g, (match) => {
    const dataUrl = getResolvedDataUrl(match);
    return dataUrl || match; // 没完成转换就保留原样
  });
}

/** 将图片 src（可能是 blob URL 或 data URL）转为可传输的 data URL */
async function convertSrcToDataUrl(src: string): Promise<string | null> {
  if (src.startsWith('data:')) return src;
  if (src.startsWith('blob:')) {
    // 等待后台 FileReader 转换完成
    await waitForDataUrls([src]);
    return getResolvedDataUrl(src) || null;
  }
  return src;
}

export default function Sidepanel() {
  const [page, setPage] = useState<Page>('dashboard');
  const { draft, setDraft, loadDemo, contents, records, saveContent, addRecord, loadContents, loadRecords } = useContentStore();
  const [selected, setSelected] = useState<Set<PlatformType>>(new Set(PLATFORMS.map((p) => p.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewOutputs, setPreviewOutputs] = useState<PreviewOutput[]>([]);
  const [activeTab, setActiveTab] = useState<PlatformType>('wechat');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishedSet, setPublishedSet] = useState<Set<PlatformType>>(new Set());
  const [publishResults, setPublishResults] = useState<Record<string, PublishResult>>({});
  const [editingOutput, setEditingOutput] = useState<EditingOutput | null>(null);
  const [autoLayout, setAutoLayout] = useState(false);

  const startWithPlatform = (platform: PlatformType) => {
    setSelected(new Set([platform]));
    setError('');
    setNotice(null);
    setPage('editor');
  };

  useEffect(() => { loadContents(); loadRecords(); }, []);

  const active = previewOutputs.find((o) => o.platform === activeTab);
  const previewPlatforms = useMemo(
    () => PLATFORMS.filter((p) => previewOutputs.some((o) => o.platform === p.id)),
    [previewOutputs],
  );

  const showNotice = (n: Notice) => { setNotice(n); setTimeout(() => setNotice(null), 4000); };

  const buildSourceContent = (id = genId()): StandardContent => ({
    id, title: draft.title, rawMarkdown: draft.rawMarkdown,
    blocks: parseMarkdownToBlocks(draft.rawMarkdown),
    tags: parseTags(draft.tags),
    summary: draft.summary || undefined,
    coverImage: draft.coverImage || undefined,
  });

  const adaptContent = (source: StandardContent, platforms: PlatformType[]): PreviewOutput[] =>
    platforms.map((pid) => {
      const adapter = getAdapter(pid);
      const output = adapter.transform(source);
      const validation = adapter.validate(source);
      return { ...output, platform: pid, platformName: adapter.displayName, outputId: genId(), validationMessages: validation.messages };
    });

  const resetPublishState = () => { setPublishedSet(new Set()); setPublishResults({}); setEditingOutput(null); };

  const handleGenerate = async () => {
    const text = stripHtml(draft.rawMarkdown);
    if (!draft.title.trim() || !text) { setError('标题和正文不能为空'); return; }
    if (selected.size === 0) { setError('请至少选择一个平台'); return; }
    setLoading(true); setError(''); setNotice(null);
    try {
      const source = buildSourceContent();
      const outputs = adaptContent(source, Array.from(selected));
      // data URL 图片不持久化到 chrome.storage（超 8KB 配额），存标记即可
      const persistCover = draft.coverImage && !draft.coverImage.startsWith('data:')
        ? draft.coverImage
        : (draft.coverImage ? '[local]' : undefined);
      // 正文中的 data/blob URL 图片不持久化（HTML + Markdown 格式都要清）
      const cleanMarkdown = draft.rawMarkdown
        .replace(/<img[^>]*src\s*=\s*["'](?:data:image|blob):[^"']*["'][^>]*\/?>/gi, '')
        .replace(/!\[[^\]]*\]\((?:data:image|blob):[^)]+\)/gi, '');
      await saveContent({
        id: source.id, title: draft.title, rawMarkdown: cleanMarkdown,
        tags: source.tags, summary: draft.summary || undefined,
        coverImage: persistCover,
        outputs: outputs.map((o) => ({
          id: o.outputId, platform: o.platform, platformName: o.platformName,
          title: o.title, summary: o.summary,
          // 输出正文也不存 data URL（图片由 Content Script 上传时处理）
          body: o.body
            .replace(/<img[^>]*src\s*=\s*["'](?:data:image|blob):[^"']*["'][^>]*\/?>/gi, '')
            .replace(/!\[[^\]]*\]\((?:data:image|blob):[^)]+\)/gi, ''),
          tags: o.tags,
          // 输出的封面图也不存 data URL
          coverImage: o.coverImage && !String(o.coverImage).startsWith('data:') ? o.coverImage : undefined,
          extra: o.extra, status: 'ready',
          validationMessages: o.validationMessages || [],
        })),
        createdAt: new Date().toISOString(),
      });
      // 预览前把 blob URL → data URL，确保图片在任何时候都可见
      const resolved = await resolveBlobUrlsInOutputs(outputs);
      setPreviewOutputs(resolved);
      if (outputs.length > 0) setActiveTab(outputs[0].platform);
      resetPublishState();
      setPage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally { setLoading(false); }
  };

  const regeneratePreview = async () => {
    const text = stripHtml(draft.rawMarkdown);
    if (!draft.title.trim() || !text) { showNotice({ type: 'error', message: '标题和正文不能为空' }); return; }
    const platforms = previewOutputs.length > 0 ? previewOutputs.map((o) => o.platform) : Array.from(selected);
    const outputs = adaptContent(buildSourceContent(), platforms);
    const resolved = await resolveBlobUrlsInOutputs(outputs);
    setPreviewOutputs(resolved);
    if (outputs.length > 0) setActiveTab(outputs[0].platform);
    resetPublishState();
    showNotice({ type: 'success', message: '已重新生成平台适配版本' });
  };

  const saveOutputEdit = () => {
    if (!editingOutput) return;
    const tags = parseTags(editingOutput.tags);
    setPreviewOutputs((prev) => prev.map((o) =>
      o.outputId === editingOutput.outputId
        ? { ...o, title: editingOutput.title, summary: editingOutput.summary || undefined, body: editingOutput.body, tags }
        : o));
    setEditingOutput(null);
    showNotice({ type: 'success', message: '已保存编辑' });
  };

  const publishOne = async (output: PreviewOutput) => {
    setPublishing(output.outputId); setNotice(null);
    try {
      // 构建图片列表：封面图 + 正文中的本地图片
      // 封面图 + 正文图片（支持 data URL 和 blob URL）
      const images: ImagePayload[] = [];
      if (draft.coverImage) {
        const coverDataUrl = draft.coverImage.startsWith('blob:')
          ? await convertSrcToDataUrl(draft.coverImage)
          : draft.coverImage;
        if (coverDataUrl) {
          images.push({
            id: 'cover',
            dataUrl: coverDataUrl,
            filename: 'cover.png',
            mimeType: coverDataUrl.match(/data:(image\/[^;]*);/)?.[1] || 'image/png',
          });
        }
      }
      const bodySrcs = extractImageSrcs(draft.rawMarkdown);
      for (let i = 0; i < bodySrcs.length; i++) {
        const src = bodySrcs[i];
        if (src === draft.coverImage) continue;
        const dataUrl = await convertSrcToDataUrl(src);
        if (dataUrl && dataUrl.startsWith('data:')) {
          images.push({
            id: `img_${i}`,
            dataUrl,
            filename: `image_${i}.png`,
            mimeType: dataUrl.match(/data:(image\/[^;]*);/)?.[1] || 'image/png',
          });
        }
      }

      const response = await chrome.runtime.sendMessage({
        type: 'PUBLISH_TO_PLATFORM',
        payload: {
          platform: output.platform,
          platformName: output.platformName,
          content: output,
          autoLayout: (output.platform === 'xiaohongshu' || output.platform === 'wechat') ? autoLayout : undefined,
          images: images.length > 0 ? images : undefined,
        },
      }) as PublishResult | undefined;
      console.log('[SP-IMG] publishOne platform:', output.platform, 'images count:', images.length, 'ids:', images.map(i => i.id), 'sizes:', images.map(i => i.dataUrl.length));
      const result: PublishResult = response || { platform: output.platform, platformName: output.platformName, status: 'failed', message: '未收到发布结果' };
      setPublishedSet((prev) => { const n = new Set(prev); result.status === 'success' ? n.add(output.platform) : n.delete(output.platform); return n; });
      setPublishResults((prev) => ({ ...prev, [output.platform]: result }));
      showNotice({ type: result.status === 'success' ? 'success' : 'error', message: result.message });
      await addRecord({ id: genId(), contentId: '', platform: output.platform, platformName: output.platformName, status: result.status, message: result.message, mockUrl: result.mockUrl, publishedAt: new Date().toISOString() });
    } catch (err) {
      const result: PublishResult = { platform: output.platform, platformName: output.platformName, status: 'failed', message: err instanceof Error ? err.message : '发布失败' };
      setPublishedSet((prev) => { const n = new Set(prev); n.delete(output.platform); return n; });
      setPublishResults((prev) => ({ ...prev, [output.platform]: result }));
      showNotice({ type: 'error', message: result.message });
      await addRecord({ id: genId(), contentId: '', platform: output.platform, platformName: output.platformName, status: 'failed', message: result.message, publishedAt: new Date().toISOString() });
    } finally { setPublishing(null); }
  };

  const publishAll = async () => { for (const o of previewOutputs) await publishOne(o); };

  const exportPackage = () => {
    if (previewOutputs.length === 0) { showNotice({ type: 'error', message: '没有可导出的适配内容' }); return; }
    const manifest = { title: draft.title, exportedAt: new Date().toISOString(), platforms: previewOutputs.map((o) => ({ platform: o.platform, platformName: o.platformName, title: o.title, tags: o.tags, status: publishedSet.has(o.platform) ? 'published' : 'ready' })) };
    const files: ZipFile[] = [{ name: 'manifest.json', content: JSON.stringify(manifest, null, 2) }, { name: 'source.html', content: draft.rawMarkdown }];
    for (const o of previewOutputs) {
      const base = `${o.platform}-${sanitizeFilename(o.title)}`;
      files.push({ name: `${base}.html`, content: outputToHtml(o) }, { name: `${base}.json`, content: JSON.stringify(o, null, 2) });
    }
    downloadBlob(createZipBlob(files), `multipublish-${timestampSlug()}.zip`);
    showNotice({ type: 'success', message: '发布包已导出为 zip' });
  };

  const captureScreenshot = async () => {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
      downloadBlob(dataUrlToBlob(dataUrl), `screenshot-${timestampSlug()}.png`);
      showNotice({ type: 'success', message: '截图已保存' });
    } catch (err) { showNotice({ type: 'error', message: err instanceof Error ? `截图失败：${err.message}` : '截图失败' }); }
  };

  /* ══════════════ PREVIEW PAGE ══════════════ */
  if (page === 'preview') {
    if (!active) {
      return (
        <div className="page">
          <div className="header">
            <div className="header-left">
              <button onClick={() => setPage('editor')} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></button>
              <h2 className="title">平台预览</h2>
            </div>
          </div>
          <div className="notice notice-error">暂无可预览内容，请返回编辑器生成适配版本。</div>
        </div>
      );
    }
    const activeResult = publishResults[active.platform];
    const isPublishing = publishing === active.outputId;
    const isSuccess = publishedSet.has(active.platform) || activeResult?.status === 'success';
    const isFailed = activeResult?.status === 'failed';

    return (
      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('editor')} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></button>
            <h2 className="title">平台预览</h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={exportPackage} className="btn btn-ghost btn-sm"><Download size={12} /></button>
            <button onClick={regeneratePreview} className="btn btn-ghost btn-sm"><RefreshCw size={12} /></button>
          </div>
        </div>

        {notice && <div className={`notice notice-${notice.type}`}>{notice.message}</div>}

        {/* Platform Tabs */}
        <div className="tabs">
          {previewPlatforms.map((p) => {
            const isActive = p.id === activeTab;
            return (
              <button key={p.id} onClick={() => { setActiveTab(p.id); setEditingOutput(null); }}
                className={`tab ${isActive ? 'active' : ''}`}
                style={{ borderColor: isActive ? p.color : undefined, backgroundColor: isActive ? `${p.color}14` : undefined, color: isActive ? p.color : undefined }}>
                <span className="tab-dot" style={{ backgroundColor: p.color }} />{p.name}
                {publishedSet.has(p.id) && <CheckCircle size={9} style={{ color: 'var(--success)' }} />}
                {publishResults[p.id]?.status === 'failed' && <AlertCircle size={9} style={{ color: 'var(--danger)' }} />}
              </button>
            );
          })}
        </div>

        {/* Content Card */}
        <div className="card">
          {editingOutput?.outputId === active.outputId ? (
            /* ── Edit Mode ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 图片预览 — 来自编辑器，不放在 textarea 里 */}
              {renderPreviewImages(draft.rawMarkdown)}
              <input value={editingOutput.title} onChange={(e) => setEditingOutput({ ...editingOutput, title: e.target.value })} className="input" placeholder="平台标题" />
              <input value={editingOutput.summary} onChange={(e) => setEditingOutput({ ...editingOutput, summary: e.target.value })} className="input" placeholder="摘要（可选）" />
              <textarea value={editingOutput.body} onChange={(e) => setEditingOutput({ ...editingOutput, body: e.target.value })} className="input" placeholder="平台正文" style={{ minHeight: 200, fontFamily: 'var(--font-mono)', lineHeight: 1.7 }} />
              <input value={editingOutput.tags} onChange={(e) => setEditingOutput({ ...editingOutput, tags: e.target.value })} className="input" placeholder="标签，逗号分隔" />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditingOutput(null)} className="btn btn-ghost btn-sm"><X size={12} />取消</button>
                <button onClick={saveOutputEdit} className="btn btn-primary btn-sm"><Save size={12} />保存</button>
              </div>
            </div>
          ) : (
            /* ── Display Mode ── */
            <>
              {/* Title + Status */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div className="display" style={{ fontSize: 15, flex: 1 }}>{active.title}</div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {isSuccess && <span className="badge badge-success"><CheckCircle size={9} />已发布</span>}
                    {isFailed && <span className="badge badge-error"><XCircle size={9} />失败</span>}
                  </div>
                </div>
                {active.summary && <div className="text-dim text-sm" style={{ marginTop: 3 }}>{active.summary}</div>}
              </div>

              {/* Result message */}
              {activeResult && (
                <div className={`notice notice-${activeResult.status === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 8 }}>
                  {activeResult.message}
                </div>
              )}

              {/* Tags */}
              <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {active.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>

              {/* 图片 — 直接从编辑器 HTML 提取，不经过适配器链 */}
              {renderPreviewImages(draft.rawMarkdown)}

              {/* Body */}
              <div className="preview-body" style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: renderPreviewBody(active.body) }} />

              {/* Validation */}
              {!!active.validationMessages?.length && (
                <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {active.validationMessages.map((m, i) => (
                    <div key={i} className={`notice notice-${m.level === 'error' ? 'error' : m.level === 'warning' ? 'error' : 'info'}`}>
                      {m.level === 'error' ? '❌' : m.level === 'warning' ? '⚠️' : 'ℹ️'} {m.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Auto Layout Toggle */}
              {(active.platform === 'xiaohongshu' || active.platform === 'wechat') && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={autoLayout}
                    onChange={(e) => setAutoLayout(e.target.checked)}
                    style={{ accentColor: active.platform === 'xiaohongshu' ? '#FF5A5F' : '#07C160', width: 14, height: 14 }}
                  />
                  <Sparkles size={12} style={{ color: active.platform === 'xiaohongshu' ? '#FF5A5F' : '#07C160' }} />
                  {active.platform === 'xiaohongshu' ? '一键排版后自动发布（排版→下一步→发布）' : '填充后自动发布（群发→确认）'}
                </label>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditingOutput({
                  outputId: active.outputId, title: active.title,
                  summary: active.summary || '', body: active.body,
                  tags: active.tags.join(', '),
                })} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                  <Edit3 size={12} />编辑
                </button>
                <button onClick={() => publishOne(active)} disabled={isPublishing}
                  className="btn btn-primary btn-sm btn-publish" style={{ flex: 2 }}>
                  {isPublishing ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                  {isFailed ? '重试发布' : isSuccess ? '再次发布' : `发布到${active.platformName}`}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Publish All — bottom, full-width */}
        <button onClick={publishAll} disabled={publishing !== null}
          className="btn btn-primary btn-block btn-publish" style={{ padding: '11px', fontSize: 13, gap: 8 }}>
          {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
          一键发布全部平台
        </button>
      </div>
    );
  }

  /* ══════════════ RECORDS PAGE ══════════════ */
  if (page === 'records') {
    return (
      <div className="page">
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></button>
            <h2 className="title">发布记录</h2>
          </div>
          <span className="text-dim text-sm">{records.length} 条</span>
        </div>
        {notice && <div className={`notice notice-${notice.type}`}>{notice.message}</div>}
        {records.length === 0 ? (
          <div className="empty-state">
            <FileText size={28} className="empty-state-icon" />
            <p className="empty-state-text">暂无发布记录</p>
            <button onClick={() => setPage('editor')} className="btn btn-primary btn-sm">开始创作</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...records].reverse().map((r) => {
              const p = PLATFORMS.find((x) => x.id === r.platform);
              return (
                <div key={r.id} className="card card-flat record-item">
                  <div className="record-platform">
                    <span className="tab-dot" style={{ backgroundColor: p?.color || '#999' }} />
                    <span className="name">{r.platformName}</span>
                  </div>
                  <span className={`record-status ${r.status === 'success' ? 'success' : 'failed'}`}>
                    {r.status === 'success' ? <CheckCircle size={10} style={{ display: 'inline', marginRight: 2 }} /> : <XCircle size={10} style={{ display: 'inline', marginRight: 2 }} />}
                    {r.status === 'success' ? '成功' : '失败'}
                  </span>
                  <span className="record-time">{new Date(r.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ══════════════ EDITOR PAGE ══════════════ */
  if (page === 'editor') {
    return (
      <div className="page">
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></button>
            <h2 className="title">新建内容</h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { loadDemo(); setError(''); setNotice(null); }} className="btn btn-ghost btn-sm"><Sparkles size={12} />Demo</button>
            <button onClick={handleGenerate} disabled={loading} className="btn btn-primary btn-sm">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}生成
            </button>
          </div>
        </div>

        {notice && <div className={`notice notice-${notice.type}`}>{notice.message}</div>}
        {error && <div className="notice notice-error">{error}</div>}

        <div>
          <label className="help-text" style={{ display: 'block', marginBottom: 4, fontSize: 11, color: 'var(--text-secondary)' }}>标题</label>
          <input type="text" value={draft.title} onChange={(e) => setDraft({ title: e.target.value })}
            placeholder="输入文章标题..." className="input"
            style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)' }} />
        </div>

        <div>
          <label className="help-text" style={{ display: 'block', marginBottom: 4, fontSize: 11, color: 'var(--text-secondary)' }}>正文</label>
          <TiptapEditor content={draft.rawMarkdown} placeholder="支持 Markdown：# 标题、**加粗**、- 列表、> 引用..."
            onChange={(html) => setDraft({ rawMarkdown: html })} />
        </div>

        <div className="input-row">
          <input type="text" value={draft.tags} onChange={(e) => setDraft({ tags: e.target.value })}
            placeholder="标签，逗号分隔" className="input" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="help-text" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>封面图</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                📁 选择图片
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setDraft({ coverImage: reader.result as string });
                    reader.readAsDataURL(file);
                  }} />
              </label>
              {draft.coverImage && (
                <button onClick={() => setDraft({ coverImage: '' })} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 6px' }}>
                  <X size={12} />清除
                </button>
              )}
            </div>
            {draft.coverImage ? (
              <img src={draft.coverImage} alt="封面预览"
                style={{ width: '100%', maxWidth: 200, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'cover', aspectRatio: '3/4' }} />
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>未选择封面图（可选）</span>
            )}
          </div>
        </div>

        <div>
          <div className="help-text" style={{ marginBottom: 6 }}>目标平台 — 为每个平台生成专属风格的适配版本</div>
          <div className="platform-grid">
            {PLATFORMS.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <button key={p.id} type="button"
                  className={`platform-pill ${isSelected ? 'active' : ''}`}
                  aria-pressed={isSelected}
                  title={isSelected ? `取消选择${p.name}` : `选择${p.name}`}
                  style={isSelected ? { borderColor: p.color, boxShadow: `0 0 0 2px ${p.color}22` } : undefined}
                  onClick={() => setSelected((prev) => {
                    const n = new Set(prev);
                    n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                    return n;
                  })}>
                  <span className="dot" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                  {isSelected && <CheckCircle size={11} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ DASHBOARD ══════════════ */
  const successCount = records.filter((r) => r.status === 'success').length;
  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo">M</div>
            <h1 className="title">MultiPublish</h1>
          </div>
          <p className="subtitle">一次创作 · 多端适配 · 真实发布</p>
        </div>
      </div>

      {notice && <div className={`notice notice-${notice.type}`}>{notice.message}</div>}

      {/* Stats */}
      <div className="stats">
        <div className="card stat-card">
          <div className="stat-value">{contents.length}</div>
          <div className="stat-label">篇内容</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">次发布</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{successCount}</div>
          <div className="stat-label">次成功</div>
        </div>
      </div>

      {/* Platform Cards */}
      <div>
        <h3 className="help-text" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>支持平台</h3>
        <div className="platform-cards">
          {PLATFORMS.map((p) => (
            <button key={p.id} type="button" className="platform-card" onClick={() => startWithPlatform(p.id)}
              aria-label={`使用${p.name}开始创作`}>
              <div className="platform-card-icon" style={{ backgroundColor: p.color }}>{p.name[0]}</div>
              <div className="platform-card-name">{p.name}</div>
              <div className="platform-card-desc">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button onClick={() => { setError(''); setNotice(null); setPage('editor'); }}
        className="btn btn-primary btn-block" style={{ padding: '11px', fontSize: 13, gap: 8 }}>
        <PenLine size={15} />开始创作
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { loadRecords(); setPage('records'); }} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
          <LayoutDashboard size={12} />发布记录
        </button>
        <button onClick={captureScreenshot} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
          <Camera size={12} />截图
        </button>
        <button onClick={() => setPage('settings')} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
          <Settings size={12} />设置
        </button>
      </div>

      {/* Recent Contents */}
      {contents.length > 0 && (
        <div>
          <div className="help-text" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>最近内容</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[...contents].reverse().slice(0, 5).map((c) => (
              <div key={c.id} className="card card-flat card-clickable record-item"
                onClick={() => {
                  setDraft({ title: c.title, rawMarkdown: c.rawMarkdown, tags: c.tags.join(', '), coverImage: c.coverImage || '', summary: c.summary || '' });
                  setNotice(null); resetPublishState();
                  if (c.outputs?.length) {
                    const outputs = c.outputs.map((o) => ({ ...o, platform: o.platform as PlatformType, outputId: o.id, validationMessages: o.validationMessages || [] }));
                    setPreviewOutputs(outputs); setSelected(new Set(outputs.map((o) => o.platform)));
                    setActiveTab(outputs[0].platform); setPage('preview');
                  } else { setPage('editor'); }
                }}>
                <span className="name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════ SETTINGS PAGE ══════════════ */
  if (page === 'settings') {
    const platformStatus = [
      { id: 'wechat' as PlatformType, name: '公众号', color: '#07C160', status: '自动发布', detail: '自动填充 + 自动群发', done: true },
      { id: 'zhihu' as PlatformType, name: '知乎', color: '#448AFF', status: '完整发布链路', detail: '自动填充 + 自动发布', done: true },
      { id: 'bilibili' as PlatformType, name: 'B站', color: '#FB7299', status: '填充可用', detail: '手动确认发布', done: false },
      { id: 'xiaohongshu' as PlatformType, name: '小红书', color: '#FF5A5F', status: '完整发布链路', detail: '自动填充 + 一键排版 + 自动发布', done: true },
    ];

    return (
      <div className="page">
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></button>
            <h2 className="title">设置</h2>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div className="logo" style={{ margin: '0 auto 10px', width: 40, height: 40, fontSize: 20 }}>M</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>MultiPublish</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>v1.2.0</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>一次创作 · 多端适配 · 真实发布</div>
        </div>

        <div>
          <div className="help-text" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>平台功能状态</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {platformStatus.map((p) => (
              <div key={p.id} className="card card-flat" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.detail}</div>
                </div>
                <span style={{ fontSize: 10, color: p.done ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  {p.done ? '✅' : '⚠️'} {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-flat" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
          <Github size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <a href="https://github.com/huyan1349/MultiPublish" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
            github.com/huyan1349/MultiPublish
          </a>
        </div>

        <button onClick={() => setPage('dashboard')} className="btn btn-ghost btn-sm btn-block">
          <ArrowLeft size={12} />返回首页
        </button>
      </div>
    );
  }
}
