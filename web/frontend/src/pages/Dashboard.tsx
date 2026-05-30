import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, FileText, ArrowRight, Zap, Sparkles } from 'lucide-react';
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
  const [typewriterDone, setTypewriterDone] = useState(false);

  useEffect(() => {
    api.listContents().then(setContents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTypewriterDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[780px] mx-auto px-10 py-14">
        <div className="mb-14 px-fade-in">
          <div className="relative px-hero-dots py-10 px-8 -mx-8 mb-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
              <span className="px-label">MULTIPUBLISH</span>
            </div>
            <h1 className="font-mono font-bold text-[28px] text-tx tracking-tight leading-[1.1]">
              一次编写<span className="text-dot-red">,</span><br />
              <span className="px-typewriter">全平台触达</span>
            </h1>
            <p className="font-mono text-[10px] text-tx-mute mt-5 tracking-wide font-light">
              WRITE ONCE · PUBLISH EVERYWHERE
              {!typewriterDone && <span className="px-blink ml-1">▌</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-14">
          {[
            { to: '/editor', icon: PenLine, title: 'NEW POST', desc: '编写内容并发布到多平台', cta: 'START', iconColor: 'text-tx' },
            { to: '/inspiration', icon: Sparkles, title: 'INSPIRATION', desc: 'AI 灵感生成与辅助创作', cta: 'EXPLORE', iconColor: 'text-dot-red' },
            { to: '/records', icon: FileText, title: 'RECORDS', desc: '查看历史发布状态', cta: 'VIEW', iconColor: 'text-tx-dim' },
          ].map((card, i) => (
            <button
              key={card.to}
              onClick={() => navigate(card.to)}
              className={`group px-card p-5 text-left transition-all duration-200 px-fade-in px-stagger-${i + 1}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <card.icon size={13} className={card.iconColor} strokeWidth={1.5} />
                <span className="font-mono font-bold text-[10px] text-tx tracking-wide">{card.title}</span>
              </div>
              <p className="text-[11px] text-tx-dim leading-relaxed font-light">{card.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-tx-faint group-hover:text-tx-dim transition-colors duration-200">
                <span className="font-mono text-[9px] tracking-wide">{card.cta}</span>
                <ArrowRight size={9} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>

        <div className="mb-14 px-fade-in px-stagger-4" style={{ animationFillMode: 'both' }}>
          <div className="px-label mb-4">PLATFORMS</div>
          <div className="flex gap-5">
            {platforms.map((p) => (
              <div key={p.key} className="flex items-center gap-2 cursor-default">
                <div className="px-dot px-pulse-dot" style={{ backgroundColor: p.color }} />
                <span className="font-mono text-[9px] text-tx-dim tracking-wide">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-fade-in px-stagger-5" style={{ animationFillMode: 'both' }}>
          <div className="px-label mb-4">RECENT</div>
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="px-card p-4">
                  <div className="h-2.5 px-shimmer w-1/3 mb-1.5" />
                  <div className="h-2 px-shimmer w-1/4" />
                </div>
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="px-card border-dashed border-px-border p-14 text-center">
              <Zap size={16} className="mx-auto text-tx-faint mb-3 px-float" strokeWidth={1.5} />
              <p className="font-mono text-[10px] text-tx-mute mb-0.5">NO CONTENT YET</p>
              <p className="text-[10px] text-tx-faint mb-5 font-light">点击 NEW POST 开始创作</p>
              <button onClick={() => navigate('/editor')} className="px-btn-primary text-[9px]">
                WRITE FIRST POST
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {contents.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/contents/${item.id}/preview`)}
                  className="w-full px-card p-3.5 text-left flex items-center justify-between group px-fade-in"
                  style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-tx truncate mb-1">{item.title || 'UNTITLED'}</p>
                    <div className="flex gap-1">
                      {item.tags.map((t, i) => (
                        <span key={i} className="px-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-tx-faint group-hover:text-tx-dim transition-colors shrink-0 ml-3">
                    <span className="font-mono text-[9px]">{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
                    <ArrowRight size={9} className="transition-transform duration-200 group-hover:translate-x-0.5" />
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
