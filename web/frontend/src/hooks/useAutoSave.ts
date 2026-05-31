import { useEffect, useRef, useState, useCallback } from 'react';
import { useContentStore } from '../stores/contentStore';
import { api } from '../api/client';

const STORAGE_KEY = 'multipublish_draft';
const SAVE_INTERVAL = 3000;
const BACKEND_SYNC_INTERVAL = 15000;

interface AutoSaveState {
  lastSaved: Date | null;
  isSaving: boolean;
  lastBackendSync: Date | null;
}

export function useAutoSave(): AutoSaveState {
  const draft = useContentStore((s) => s.draft);
  const currentContentId = useContentStore((s) => s.currentContentId);
  const saveToStorage = useContentStore((s) => s.saveToStorage);
  const loadFromStorage = useContentStore((s) => s.loadFromStorage);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastBackendSync, setLastBackendSync] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const prevJsonRef = useRef<string>('');
  const mountedRef = useRef(false);
  const lastBackendJsonRef = useRef<string>('');

  const syncToBackend = useCallback(async () => {
    if (!currentContentId) return;
    const currentJson = JSON.stringify(draft);
    if (currentJson === lastBackendJsonRef.current) return;
    if (!draft.title && !draft.htmlContent) return;

    try {
      const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      await api.updateContent(currentContentId, {
        title: draft.title,
        rawMarkdown: draft.htmlContent,
        tags,
        coverImage: draft.coverImage || undefined,
      });
      lastBackendJsonRef.current = currentJson;
      setLastBackendSync(new Date());
    } catch {
      // backend not available, skip silently
    }
  }, [currentContentId, draft]);

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

  useEffect(() => {
    if (!currentContentId) return;
    const timer = setTimeout(() => {
      syncToBackend();
    }, BACKEND_SYNC_INTERVAL);

    return () => clearTimeout(timer);
  }, [draft, currentContentId, syncToBackend]);

  return { lastSaved, isSaving, lastBackendSync };
}
