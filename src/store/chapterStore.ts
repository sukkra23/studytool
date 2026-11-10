import { create } from 'zustand';
import { db, emptyChapter } from '../db/db';
import type { Chapter, NotesData, Question, WebData } from '../types';

interface ChapterState {
  chapter: Chapter | null;
  status: 'saved' | 'saving';
  load: (folderId: string | null) => Promise<void>;
  setWeb: (web: WebData) => void;
  setNotes: (patch: Partial<NotesData>) => void;
  setQuestions: (questions: Question[]) => void;
  /** Write any pending change to IndexedDB right now. */
  flush: () => Promise<void>;
}

const SAVE_DELAY = 250;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useChapterStore = create<ChapterState>((set, get) => {
  const persist = async () => {
    timer = undefined;
    const ch = get().chapter;
    if (!ch) return;
    await db.chapters.put(ch);
    if (get().chapter === ch) set({ status: 'saved' });
  };

  // Every change lands here: update memory immediately, then autosave shortly after.
  const change = (patch: Partial<Chapter>) => {
    const ch = get().chapter;
    if (!ch) return;
    set({ chapter: { ...ch, ...patch }, status: 'saving' });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void persist(), SAVE_DELAY);
  };

  return {
    chapter: null,
    status: 'saved',

    load: async (folderId) => {
      await get().flush();
      if (!folderId) {
        set({ chapter: null });
        return;
      }
      let ch = await db.chapters.where('folderId').equals(folderId).first();
      if (!ch) {
        ch = emptyChapter(folderId);
        await db.chapters.add(ch);
      }
      set({ chapter: ch, status: 'saved' });
    },

    setWeb: (web) => change({ web }),
    setNotes: (patch) => change({ notes: { ...get().chapter!.notes, ...patch } }),
    setQuestions: (questionBank) => change({ questionBank }),

    flush: async () => {
      if (timer) {
        clearTimeout(timer);
        await persist();
      }
    },
  };
});

if (typeof window !== 'undefined') {
  const flush = () => void useChapterStore.getState().flush();
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
