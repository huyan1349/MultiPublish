import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'multipublish_demo_mode';

export function useDemoMode() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const handler = ((e: CustomEvent) => setEnabled(e.detail)) as EventListener;
    window.addEventListener('demo-mode-change', handler);
    return () => window.removeEventListener('demo-mode-change', handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
    setEnabled(next);
    window.dispatchEvent(new CustomEvent('demo-mode-change', { detail: next }));
  }, [enabled]);

  return { enabled, toggle };
}
