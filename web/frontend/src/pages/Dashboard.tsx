import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, FileText, ArrowRight, Zap } from 'lucide-react';
import { api } from '../api/client';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

const platforms = [
  { key: 'wechat', name: 'WECHAT', color: '#07C160' },
  { key: 'zhihu', name: 'ZHIHU', color: '#0066FF' },
  { key: 'bilibili', name: 'BILIBILI', color: '#FB7299' },
  { key: 'xiaohongshu', name: 'XIAOHONGSHU', color: '#FF2442' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listContents()
      .then(setContents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-10 py-14">
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-dot-red" />
            <span className="px-label">MULTIPUBLISH</span>
          </div>
          <h1 className="font-mono font-bold text-[28px] text-tx tracking-tight leading-none">
            一次编写<span className="text-dot-red">,</span><br />全平台触达
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-14">
          <button
            onClick={() => navigate('/editor')}
            className="group px-card p-5 text-left transition-colors duration-100 hover:border-dot-red"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <PenLine size={14} className="text-dot-red" strokeWidth={1.5} />
              <span className="font-mono font-bold text-[11px] text-tx tracking-wide">NEW POST</span>
            </div>
            <p className="text-xs text-tx-dim leading-relaxed">在编辑器中编写内容，选择平台并发布</p>
            <div className="mt-4 flex items-center gap-1 text-tx-faint group-hover:text-dot-red transition-colors">
              <span className="font-mono text-[10px] tracking-wide">START</span>
              <ArrowRight size={10} />
            </div>
          </button>

          <button
            onClick={() => navigate('/records')}
            className="group px-card p-5 text-left transition-colors duration-100 hover:border-tx-mute"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <FileText size={14} className="text-tx-dim" strokeWidth={1.5} />
              <span className="font-mono font-bold text-[11px] text-tx tracking-wide">RECORDS</span>
            </div>
            <p className="text-xs text-tx-dim leading-relaxed">查看历史发布状态和结果</p>
            <div className="mt-4 flex items-center gap-1 text-tx-faint group-hover:text-tx-dim transition-colors">
              <span className="font-mono text-[10px] tracking-wide">VIEW</span>
              <ArrowRight size={10} />
            </div>
          </button>
        </div>

        <div className="mb-14">
          <div className="px-label mb-4">PLATFORMS</div>
          <div className="flex gap-4">
            {platforms.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <div className="w-[6px] h-[6px]" style={{ backgroundColor: p.color }} />
                <span className="font-mono text-[10px] text-tx-dim tracking-wide">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="px-label mb-4">RECENT</div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="px-card p-4 animate-pulse">
                  <div className="h-3 bg-px-surface w-1/3 mb-2" />
                  <div className="h-2 bg-px-surface w-1/4" />
                </div>
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="px-card border-dashed border-px-border p-12 text-center">
              <Zap size={16} className="mx-auto text-tx-faint mb-3" strokeWidth={1.5} />
              <p className="font-mono text-[11px] text-tx-mute mb-1">NO CONTENT YET</p>
              <p className="text-[11px] text-tx-faint mb-5">点击 NEW POST 开始创作</p>
              <button onClick={() => navigate('/editor')} className="px-btn-primary text-[10px]">
                WRITE FIRST POST
              </button>
            </div>
          ) : (
            <div className="space-y-px">
              {contents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/contents/${item.id}/preview`)}
                  className="w-full px-card p-4 text-left transition-colors duration-100 hover:border-tx-mute flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-tx truncate mb-1">{item.title || 'UNTITLED'}</p>
                    <div className="flex gap-1.5">
                      {item.tags.map((t, i) => (
                        <span key={i} className="font-mono text-[9px] text-tx-faint bg-px-surface px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-tx-faint group-hover:text-dot-red transition-colors shrink-0 ml-4">
                    <span className="font-mono text-[10px]">{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
                    <ArrowRight size={10} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
