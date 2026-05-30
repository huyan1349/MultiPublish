import { NavLink } from 'react-router-dom';
import { PenLine, LayoutDashboard, FileText, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'HOME' },
  { to: '/editor', icon: PenLine, label: 'EDIT' },
  { to: '/inspiration', icon: Sparkles, label: 'IDEA' },
  { to: '/records', icon: FileText, label: 'LOG' },
];

const dots = ['#07C160', '#0066FF', '#FB7299', '#FF2442'];

export default function Sidebar() {
  return (
    <aside className="w-[52px] h-screen flex flex-col items-center py-4 bg-white border-r border-px-border shrink-0">
      <div className="mb-6 flex flex-col items-center gap-1.5">
        <div className="w-7 h-7 bg-tx flex items-center justify-center">
          <span className="font-mono font-bold text-[8px] text-white tracking-widest">MP</span>
        </div>
        <div className="flex gap-[2px]" aria-hidden="true">
          {dots.map((c, i) => (
            <div key={i} className="px-dot" style={{ backgroundColor: c }} />
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
              `w-9 h-9 flex items-center justify-center transition-[background-color,color] duration-150
              ${isActive
                ? 'bg-px-surface px-nav-indicator text-tx'
                : 'text-tx-mute hover:text-tx-dim hover:bg-px-surface'
              }`
            }
            title={item.label}
            aria-label={item.label}
          >
            <item.icon size={15} strokeWidth={1.5} />
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `w-9 h-9 flex items-center justify-center transition-[background-color,color] duration-150 mb-1
          ${isActive
            ? 'bg-px-surface px-nav-indicator text-tx'
            : 'text-tx-mute hover:text-tx-dim hover:bg-px-surface'
          }`
        }
        title="SETTINGS"
        aria-label="SETTINGS"
      >
        <Settings size={15} strokeWidth={1.5} />
      </NavLink>

      <div className="font-mono text-[7px] text-tx-faint tracking-pixel mt-1">V2.1</div>
    </aside>
  );
}
