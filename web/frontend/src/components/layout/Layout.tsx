import type { ReactNode } from 'react';
import { useDemoMode } from '../../hooks/useDemoMode';
import DemoSlideshow from '../demo/DemoSlideshow';
import Sidebar from './Sidebar';

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen overflow-hidden bg-[var(--paper-bg)] rounded-[20px]">
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

  // Demo mode: left side = app in browser frame, right side = slideshow
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left: Browser-framed app */}
      <div className="flex flex-col shrink-0" style={{ width: '58vw' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#f1f3f0] border-b border-[rgba(49,56,45,0.08)] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="block w-3 h-3 rounded-full bg-[#EC6A5F]" />
            <span className="block w-3 h-3 rounded-full bg-[#F5BD4F]" />
            <span className="block w-3 h-3 rounded-full bg-[#61C454]" />
          </div>
          <div className="flex-1 mx-4 flex items-center justify-center bg-white rounded-[8px] px-4 py-1.5 border border-[rgba(49,56,45,0.08)]">
            <span className="text-[10px] text-[var(--ink-faint)] font-mono truncate">localhost:5173 — MultiPublish</span>
          </div>
        </div>
        {/* App content */}
        <div className="flex-1 overflow-hidden bg-[var(--paper-bg)]">
          <AppShell>{children}</AppShell>
        </div>
      </div>

      {/* Right: Slideshow */}
      <div className="flex-1 min-w-0">
        <DemoSlideshow onClose={toggle} />
      </div>
    </div>
  );
}
