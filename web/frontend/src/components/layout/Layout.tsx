import type { ReactNode } from 'react';
import { useDemoMode } from '../../hooks/useDemoMode';
import DemoSlideshow from '../demo/DemoSlideshow';
import Sidebar from './Sidebar';

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--paper-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-auto px-2 py-2 md:px-3 md:py-3">
        {children}
      </main>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { enabled, toggle } = useDemoMode();

  if (!enabled) {
    return (
      <div className="app-shell flex min-h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto px-2 py-2 md:px-3 md:py-3">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafaf9]">
      {/* Left: Screen mockup */}
      <div className="flex items-center justify-center shrink-0 p-8" style={{ width: '56vw' }}>
        <div className="w-full h-full flex flex-col rounded-[22px] overflow-hidden border border-[rgba(49,56,45,0.12)] bg-[var(--paper-bg)] shadow-[0_8px_40px_rgba(40,46,38,0.08),0_2px_12px_rgba(40,46,38,0.04)]">
          {/* Browser chrome */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#f1f3f0] border-b border-[rgba(49,56,45,0.07)] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="block w-2.5 h-2.5 rounded-full bg-[#EC6A5F]" />
              <span className="block w-2.5 h-2.5 rounded-full bg-[#F5BD4F]" />
              <span className="block w-2.5 h-2.5 rounded-full bg-[#61C454]" />
            </div>
            <div className="flex-1 mx-3 flex items-center justify-center bg-white rounded-[7px] px-3 py-1 border border-[rgba(49,56,45,0.06)]">
              <span className="text-[10px] text-[var(--ink-faint)] font-mono truncate">localhost:5173 — MultiPublish</span>
            </div>
          </div>
          {/* App */}
          <AppShell>{children}</AppShell>
        </div>
      </div>

      {/* Right: Auto commentary */}
      <div className="flex-1 min-w-0 border-l border-[rgba(49,56,45,0.06)]">
        <DemoSlideshow onClose={toggle} />
      </div>
    </div>
  );
}
