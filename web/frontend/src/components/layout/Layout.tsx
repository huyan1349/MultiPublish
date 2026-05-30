import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto px-2 py-2 md:px-3 md:py-3">
        {children}
      </main>
    </div>
  );
}
