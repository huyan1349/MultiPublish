import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Maximize } from 'lucide-react';
import { useDemoMode } from '../../hooks/useDemoMode';
import DemoPoster from '../demo/DemoPoster';
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

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

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
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-[#fafaf7] via-[#f7f8f4] to-[#fafaf8]">
      {/* Fullscreen button — top right */}
      <button
        onClick={handleFullscreen}
        className="absolute top-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-[rgba(49,56,45,0.08)] bg-white/60 backdrop-blur-sm px-3 py-1.5 text-[11px] text-[var(--ink-soft)] hover:bg-white hover:border-[rgba(49,56,45,0.15)] transition-all"
        title="全屏"
      >
        <Maximize size={12} />
        全屏
      </button>

      {/* Screen mockup — 80% */}
      <div className="flex flex-col items-center justify-center shrink-0" style={{ width: '80vw' }}>
        <div className="relative flex flex-col items-center">
          <div
            className="relative flex flex-col rounded-[14px] overflow-hidden border-[7px] border-[#2c2c2a] bg-[var(--paper-bg)] shadow-[0_24px_64px_rgba(40,46,38,0.1),0_4px_16px_rgba(40,46,38,0.06)]"
            style={{ width: '72vw', aspectRatio: '16/10' }}
          >
            <div className="pointer-events-none absolute inset-0 z-50 bg-gradient-to-br from-white/6 via-transparent to-transparent rounded-[7px]" />
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#e8ebe5] border-b border-[rgba(49,56,45,0.06)] shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="block w-2.5 h-2.5 rounded-full bg-[#EC6A5F]" />
                <span className="block w-2.5 h-2.5 rounded-full bg-[#F5BD4F]" />
                <span className="block w-2.5 h-2.5 rounded-full bg-[#61C454]" />
              </div>
              <div className="flex-1 mx-3 flex items-center justify-center bg-white/80 rounded-[6px] px-3 py-1">
                <span className="text-[9px] text-[var(--ink-faint)] font-mono">localhost:5173</span>
              </div>
            </div>
            <AppShell>{children}</AppShell>
          </div>
          <div className="w-20 h-3 bg-[#d5d8d2] rounded-b-[6px] -mt-[1px]" />
          <div className="w-36 h-1.5 bg-[#e0e3dc] rounded-b-[4px]" />
        </div>
      </div>

      {/* Right: vertical commentary — 20%, vertical writing */}
      <div className="flex-1 flex items-center min-w-0">
        <DemoPoster onClose={toggle} />
      </div>
    </div>
  );
}
