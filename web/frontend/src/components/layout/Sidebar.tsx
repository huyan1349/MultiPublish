import { NavLink } from 'react-router-dom';
import { PenLine, LayoutDashboard, FileText, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/editor', icon: PenLine, label: 'Editor' },
  { to: '/inspiration', icon: Sparkles, label: 'Inspiration' },
  { to: '/records', icon: FileText, label: 'Records' },
];

const dots = ['#07C160', '#0066FF', '#FB7299', '#FF2442'];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-[112px] shrink-0 flex-col px-4 py-5">
      <div className="px-card px-paper flex min-h-[calc(100vh-40px)] flex-col overflow-hidden p-4">
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <div className="px-label mb-3">MultiPublish</div>
            <div className="rounded-[22px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.8)] p-4 shadow-[0_14px_30px_rgba(70,46,28,0.06)]">
              <div className="font-['Cormorant_Garamond'] text-[30px] leading-none tracking-[-0.06em] text-[var(--ink)]">MP</div>
              <div className="mt-3 flex gap-[5px]">
                {dots.map((c, i) => (
                  <div key={i} className="px-dot" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <div className="px-label">Studio</div>
          <p className="text-[11px] leading-6 text-[var(--ink-faint)]">
            Write once. Shape every platform with editorial precision.
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `px-sidebar-link ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon size={15} strokeWidth={1.5} />
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em]">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 space-y-3">
          <NavLink
            to="/settings"
            className={({ isActive }) => `px-sidebar-link ${isActive ? 'active' : ''}`}
            title="Settings"
          >
            <Settings size={15} strokeWidth={1.5} />
            <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em]">
              Settings
            </span>
          </NavLink>

          <div className="rounded-[20px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.56)] px-3 py-4">
            <div className="px-label mb-3">Live</div>
            <div className="space-y-2">
              {[
                { label: 'Wechat', color: dots[0] },
                { label: 'Zhihu', color: dots[1] },
                { label: 'Bilibili', color: dots[2] },
                { label: 'XHS', color: dots[3] },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-['IBM_Plex_Mono']">
                  <div className="px-dot px-pulse-dot" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
            Version 2.1
          </div>
        </div>
      </div>
    </aside>
  );
}
