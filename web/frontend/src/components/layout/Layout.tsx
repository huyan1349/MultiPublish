import type { ReactNode } from 'react';
import { useDemoMode } from '../../hooks/useDemoMode';
import DemoSlideshow from '../demo/DemoSlideshow';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  const { enabled, toggle } = useDemoMode();

  return (
    <div className="app-shell flex min-h-screen overflow-hidden">
      {enabled && <div className="shrink-0" style={{ width: '62vw' }}>
        <div className="flex min-h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto px-2 py-2 md:px-3 md:py-3">
            {children}
          </main>
        </div>
      </div>}

      {!enabled && (
        <>
          <Sidebar />
          <main className="flex-1 overflow-auto px-2 py-2 md:px-3 md:py-3">
            {children}
          </main>
        </>
      )}

      {enabled && (
        <DemoSlideshow onClose={toggle} />
      )}
    </div>
  );
}
