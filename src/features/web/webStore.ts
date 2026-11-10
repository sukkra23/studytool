import { create } from 'zustand';
import { useChapterStore } from '../../store/chapterStore';
import type { Relation, WebData } from '../../types';

const HISTORY_LIMIT = 100;

interface WebState {
  past: WebData[];
  future: WebData[];
  /** Point open in the editor dialog. */
  editingPointId: string | null;
  /** Relation being created or edited in the arrow dialog. */
  relationDraft: (Relation & { isNew: boolean }) | null;
  /** Point currently flashing after a search jump. */
  highlightId: string | null;
  /** Apply a change to the open chapter's web and record it for undo. */
  commit: (next: WebData) => void;
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
}

export const getWeb = (): WebData => useChapterStore.getState().chapter!.web;

export const useWebStore = create<WebState>((set, get) => ({
  past: [],
  future: [],
  editingPointId: null,
  relationDraft: null,
  highlightId: null,

  commit: (next) => {
    const current = getWeb();
    if (next === current) return;
    set((s) => ({ past: [...s.past.slice(-HISTORY_LIMIT + 1), current], future: [] }));
    useChapterStore.getState().setWeb(next);
  },

  undo: () => {
    const { past, future } = get();
    if (!past.length) return;
    const current = getWeb();
    set({ past: past.slice(0, -1), future: [current, ...future] });
    useChapterStore.getState().setWeb(past[past.length - 1]);
  },

  redo: () => {
    const { past, future } = get();
    if (!future.length) return;
    const current = getWeb();
    set({ past: [...past, current], future: future.slice(1) });
    useChapterStore.getState().setWeb(future[0]);
  },

  resetHistory: () => set({ past: [], future: [], editingPointId: null, relationDraft: null, highlightId: null }),
}));
