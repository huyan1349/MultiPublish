import { NavLink } from 'react-router-dom';
import { PenLine, LayoutDashboard, FileText, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'HOME' },
  { to: '/editor', icon: PenLine, label: 'EDIT' },
  { to: '/inspiration', icon: Sparkles, label: 'IDEA' },
  { to: '/records', icon: FileText, label: 'LOG' },
];

const dots = [
  { color: '#07C160' },
  { color: '#0066FF' },
  { color: '#FB7299' },
  { color: '#FF2442' },
];

export default function Sidebar() {
  return (
    <aside className="w-[60px] h-screen flex flex-col items-center py-5 bg-px-bg border-r border-px-border shrink-0">
      <div className="mb-6 flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 border border-px-border flex items-center justify-center">
          <span className="font-mono font-bold text-[9px] text-tx tracking-wider">MP</span>
        </div>
        <div className="flex gap-[3px]">
          {dots.map((d, i) => (
            <div key={i} className="px-dot" style={{ backgroundColor: d.color }} />
          ))}
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `w-10 h-10 flex items-center justify-center transition-all duration-150
              ${isActive
                ? 'bg-px-hover border-l-2 border-dot-red text-tx'
                : 'border-l-2 border-transparent text-tx-mute hover:text-tx-dim hover:bg-px-surface'
              }`
            }
            title={item.label}
          >
            <item.icon size={16} strokeWidth={1.5} />
          </NavLink>
        ))}
      </nav>

      <div className="font-mono text-[8px] text-tx-faint tracking-pixel">V1.3</div>
    </aside>
  );
}
