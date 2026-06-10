import { NavLink } from 'react-router-dom';
import { PenLine, LayoutDashboard, FileText, Sparkles, Settings, CircleUserRound, Zap } from 'lucide-react';
import BrandMark from '../brand/BrandMark';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '总览' },
  { to: '/editor', icon: PenLine, label: '编辑台' },
  { to: '/contents', icon: FileText, label: '稿件' },
  { to: '/inspiration', icon: Sparkles, label: '灵感' },
  { to: '/records', icon: FileText, label: '记录' },
  { to: '/welcome', icon: Zap, label: '引导' },
];

export default function Sidebar() {
  return (
    <aside className="hidden h-full w-[74px] shrink-0 flex-col items-center overflow-hidden border-r border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.92)] py-5 md:flex">
      <div className="flex h-full min-h-0 w-full flex-col items-center px-3 py-1">
        <div className="mb-7">
          <BrandMark size={48} rounded={18} />
        </div>

        <nav className="flex min-h-0 flex-1 flex-col items-center gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex h-11 w-11 items-center justify-center rounded-[18px] border transition-all duration-150 ${
                  isActive
                    ? 'border-[var(--accent)]/25 bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_10px_22px_rgba(40,46,38,0.08)]'
                    : 'border-transparent text-[var(--ink-faint)] hover:border-[rgba(49,56,45,0.12)] hover:bg-[rgba(255,255,255,0.6)] hover:text-[var(--ink)]'
                }`
              }
              title={item.label}
            >
              <item.icon size={15} strokeWidth={1.5} />
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 flex flex-col items-center gap-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded-[18px] border transition-all duration-150 ${
                isActive
                  ? 'border-[var(--accent)]/25 bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_10px_22px_rgba(40,46,38,0.08)]'
                  : 'border-transparent text-[var(--ink-faint)] hover:border-[rgba(49,56,45,0.12)] hover:bg-[rgba(255,255,255,0.6)] hover:text-[var(--ink)]'
              }`
            }
            title="设置"
          >
            <Settings size={15} strokeWidth={1.5} />
          </NavLink>

          <div className="my-1 h-px w-8 bg-[rgba(49,56,45,0.12)]" />

          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(49,56,45,0.08)] bg-[rgba(244,249,243,0.95)] text-[var(--ink-soft)]">
            <CircleUserRound size={15} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </aside>
  );
}
