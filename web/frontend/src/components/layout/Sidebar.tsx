import { NavLink } from 'react-router-dom';
import { PenLine, LayoutDashboard, FileText } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '首页' },
  { to: '/editor', icon: PenLine, label: '编辑器' },
  { to: '/records', icon: FileText, label: '发布记录' },
];

const platformStrip = [
  { color: '#07C160' },
  { color: '#0066FF' },
  { color: '#FB7299' },
  { color: '#FF2442' },
];

export default function Sidebar() {
  return (
    <aside className="w-[68px] h-screen flex flex-col items-center pt-5 pb-4 bg-sidebar shrink-0 relative">
      <div className="absolute top-0 left-0 right-0 h-[3px] flex">
        {platformStrip.map((p, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: p.color }} />
        ))}
      </div>

      <div className="mb-8 w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-display font-bold text-sm tracking-tight">
        MP
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-150
              ${isActive
                ? 'bg-sidebar-active text-white'
                : 'text-ink-faint hover:bg-sidebar-hover hover:text-white/70'
              }`
            }
            title={item.label}
          >
            <item.icon size={19} strokeWidth={1.5} />
          </NavLink>
        ))}
      </nav>

      <div className="text-[9px] text-ink-faint/40 font-mono tracking-wider">v1.2</div>
    </aside>
  );
}
