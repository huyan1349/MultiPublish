import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-px-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto dot-grid">
        {children}
      </main>
    </div>
  );
}
