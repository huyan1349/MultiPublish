import { NavLink } from 'react-router-dom';
import { PenLine, FileText, Settings, ExternalLink } from 'lucide-react';
import { isExtensionAvailable } from '../../utils/extensionBridge';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: PenLine, label: '编辑器' },
  { to: '/records', icon: FileText, label: '发布记录' },
];

export default function Sidebar() {
  const [extOk] = useState(() => isExtensionAvailable());

  return (
    <aside className="w-16 h-screen flex flex-col items-center pt-6 pb-4 border-r border-white/6 bg-surface-light">
      {/* Logo */}
      <div className="mb-8 w-9 h-9 rounded-xl flex items-center justify-center text-white font-display text-sm font-bold"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        CB
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${isActive
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              }`
            }
            title={item.label}
          >
            <item.icon size={18} />
          </NavLink>
        ))}
      </nav>

      {/* Extension status */}
      <div className="mt-auto mb-2" title={extOk ? '扩展已连接' : '未检测到扩展'}>
        <div className={`w-2 h-2 rounded-full ${extOk ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-red-400'}`} />
      </div>
    </aside>
  );
}
