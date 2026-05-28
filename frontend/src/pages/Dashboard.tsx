import { useNavigate } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import type { PlatformConfig } from '../types';

const platforms: PlatformConfig[] = [
  { id: 'wechat', name: '公众号', icon: 'W', color: 'wechat', description: '正式长文，层次分明' },
  { id: 'zhihu', name: '知乎', icon: 'Z', color: 'zhihu', description: '逻辑分析，结论先行' },
  { id: 'bilibili', name: 'B站', icon: 'B', color: 'bilibili', description: '视频风格，标签驱动' },
  { id: 'xiaohongshu', name: '小红书', icon: 'R', color: 'xiaohongshu', description: '种草风格，短小精炼' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <header className="mb-12">
        <h1 className="font-display text-4xl text-ink mb-3 tracking-tight">
          ContentBridge
        </h1>
        <p className="text-muted text-lg leading-relaxed max-w-xl">
          一次创作，多端适配。自动将内容转换为公众号、知乎、B站、小红书的专属风格，一键模拟发布。
        </p>
      </header>

      <section className="mb-10">
        <h2 className="font-display text-xl text-ink mb-4">支持平台</h2>
        <div className="grid grid-cols-4 gap-4">
          {platforms.map((p) => (
            <div
              key={p.id}
              className="card p-5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-display text-lg font-bold mb-3 bg-${p.color}`}
              >
                {p.icon}
              </div>
              <h3 className="font-semibold text-ink mb-1">{p.name}</h3>
              <p className="text-sm text-muted">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/editor')} className="btn-primary flex items-center gap-2">
          <PenLine size={18} />
          开始创作
        </button>
        <button onClick={() => navigate('/publish-records')} className="btn-secondary">
          查看发布记录
        </button>
      </div>
    </div>
  );
}
