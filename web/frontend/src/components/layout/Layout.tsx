import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto px-4 py-4 md:px-5 md:py-5">
        {children}
      </main>
    </div>
  );
}
