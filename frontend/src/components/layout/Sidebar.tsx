import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenLine, FileText } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '首页' },
  { to: '/editor', icon: PenLine, label: '编辑器' },
  { to: '/publish-records', icon: FileText, label: '发布记录' },
];

export default function Sidebar() {
  return (
    <aside className="w-16 h-screen flex flex-col items-center pt-6 pb-4 border-r border-ink/8 bg-white">
      <div className="mb-8 w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-display text-sm font-bold">
        CB
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${isActive
                ? 'bg-ink text-white shadow-sm'
                : 'text-muted hover:bg-ink/5 hover:text-ink'
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
