import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useContentStore } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';

const PLATFORM_OPTIONS = [
  { id: 'wechat', label: '公众号', color: 'bg-wechat' },
  { id: 'zhihu', label: '知乎', color: 'bg-zhihu' },
  { id: 'bilibili', label: 'B站', color: 'bg-bilibili' },
  { id: 'xiaohongshu', label: '小红书', color: 'bg-xiaohongshu' },
];

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { draft, setDraft, loadDemo } = useContentStore();
  const [selected, setSelected] = useState<Set<string>>(new Set(['wechat', 'zhihu', 'bilibili', 'xiaohongshu']));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api.getContent(id).then((c) => {
        setDraft({
          title: c.title,
          rawMarkdown: c.rawMarkdown,
          htmlContent: c.rawMarkdown,
          tags: (c.tags || []).join(', '),
          coverImage: c.coverImage || '',
          summary: c.summary || '',
        });
      }).catch(() => setError('加载内容失败'));
    }
  }, [id]);

  const togglePlatform = (pid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const handleGenerate = async () => {
    const contentText = draft.rawMarkdown.replace(/<[^>]*>/g, '').trim();
    if (!draft.title.trim() || !contentText) {
      setError('标题和正文不能为空');
      return;
    }
    if (selected.size === 0) {
      setError('请至少选择一个平台');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const content = await api.createContent({
        title: draft.title,
        rawMarkdown: draft.rawMarkdown,
        tags: draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        coverImage: draft.coverImage || undefined,
        summary: draft.summary || undefined,
      });
      await api.adaptContent(content.id, Array.from(selected));
      navigate(`/contents/${content.id}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-ink">{id ? '编辑内容' : '新建内容'}</h1>
          <p className="text-muted mt-1">输入原始内容，选择目标平台，一键生成适配版本</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadDemo} className="btn-secondary flex items-center gap-2">
            <Sparkles size={16} /> Demo 内容
          </button>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? '生成中…' : '生成适配'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="flex gap-6">
        {/* Left: Editor */}
        <div className="flex-[3] space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">标题</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ title: e.target.value })}
              placeholder="输入文章标题…"
              className="w-full px-4 py-2.5 rounded-lg border border-ink/12 bg-white text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">正文</label>
            <TiptapEditor
              content={draft.htmlContent}
              placeholder="支持 Markdown 快捷输入：输入 # 加空格创建标题、**加粗**、- 列表…"
              onChange={(html) => setDraft({ rawMarkdown: html, htmlContent: html })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">标签（逗号分隔）</label>
              <input
                type="text"
                value={draft.tags}
                onChange={(e) => setDraft({ tags: e.target.value })}
                placeholder="内容创作, 效率工具"
                className="w-full px-4 py-2.5 rounded-lg border border-ink/12 bg-white text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">封面图 URL</label>
              <input
                type="text"
                value={draft.coverImage}
                onChange={(e) => setDraft({ coverImage: e.target.value })}
                placeholder="https://example.com/cover.jpg"
                className="w-full px-4 py-2.5 rounded-lg border border-ink/12 bg-white text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
              />
            </div>
          </div>
        </div>

        {/* Right: Platform Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink mb-3">目标平台</label>
          <div className="space-y-2">
            {PLATFORM_OPTIONS.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${selected.has(p.id) ? 'border-ink/20 bg-white shadow-sm' : 'border-transparent bg-white/50 hover:bg-white'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => togglePlatform(p.id)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span className={`w-3 h-3 rounded-full ${p.color}`} />
                <span className="font-medium text-ink text-sm">{p.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-ink/[0.03] border border-ink/6">
            <p className="text-xs text-muted leading-relaxed">
              选择平台后，系统会为每个平台生成专属风格的适配版本。可在预览页查看和编辑。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
