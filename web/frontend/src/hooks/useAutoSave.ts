import { useEffect, useRef, useState } from 'react';
import { useContentStore } from '../stores/contentStore';

const STORAGE_KEY = 'multipublish_draft';
const SAVE_INTERVAL = 3000;

interface AutoSaveState {
  lastSaved: Date | null;
  isSaving: boolean;
}

export function useAutoSave(): AutoSaveState {
  const draft = useContentStore((s) => s.draft);
  const saveToStorage = useContentStore((s) => s.saveToStorage);
  const loadFromStorage = useContentStore((s) => s.loadFromStorage);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const prevJsonRef = useRef<string>('');
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const saved = loadFromStorage();
    if (saved) {
      setLastSaved(new Date(saved.savedAt));
      prevJsonRef.current = JSON.stringify(saved.draft);
    }
  }, [loadFromStorage]);

  useEffect(() => {
    const currentJson = JSON.stringify(draft);
    if (currentJson === prevJsonRef.current) return;
    if (!draft.title && !draft.htmlContent && !draft.tags && !draft.coverImage) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        saveToStorage();
        prevJsonRef.current = currentJson;
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    }, SAVE_INTERVAL);

    return () => clearTimeout(timer);
  }, [draft, saveToStorage]);

  return { lastSaved, isSaving };
}
