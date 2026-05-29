import { NavLink } from 'react-router-dom';
import { PenLine, LayoutDashboard, FileText, ExternalLink } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '首页' },
  { to: '/editor', icon: PenLine, label: '编辑器' },
  { to: '/records', icon: FileText, label: '发布记录' },
];

export default function Sidebar() {
  return (
    <aside className="w-[60px] h-screen flex flex-col items-center pt-4 pb-4 border-r border-border bg-white shrink-0">
      <div className="mb-6 w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-xs">
        CB
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150
              ${isActive
                ? 'bg-brand-light text-brand shadow-sm'
                : 'text-ink-muted hover:bg-surface-hover hover:text-ink-secondary'
              }`
            }
            title={item.label}
          >
            <item.icon size={18} />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
