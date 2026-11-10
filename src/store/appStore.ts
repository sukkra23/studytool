import { create } from 'zustand';
import { db, emptyChapter } from '../db/db';
import { uid } from '../lib/id';
import type { Folder, FolderType } from '../types';

type Theme = 'light' | 'dark';

interface AppState {
  ready: boolean;
  folders: Folder[];
  /** Folder id of the open chapter. */
  activeId: string | null;
  /** Folder currently being renamed inline. */
  renamingId: string | null;
  theme: Theme;
  init: () => Promise<void>;
  createFolder: (parentId: string | null, type: FolderType) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleCollapse: (id: string) => Promise<void>;
  moveFolder: (id: string, parentId: string | null, index: number) => Promise<void>;
  openChapter: (id: string | null) => void;
  setRenaming: (id: string | null) => void;
  toggleTheme: () => void;
}

const DEFAULT_NAMES: Record<FolderType, string> = {
  subject: 'New Subject',
  folder: 'New Folder',
  chapter: 'New Chapter',
};

export function childrenOf(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function descendantIds(folders: Folder[], id: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    for (const f of folders) {
      if (f.parentId === pid) {
        out.push(f.id);
        walk(f.id);
      }
    }
  };
  walk(id);
  return out;
}

/** Subjects live at the root; everything else lives inside a subject or folder. */
export function canMove(folders: Folder[], dragId: string, parentId: string | null): boolean {
  const drag = folders.find((f) => f.id === dragId);
  if (!drag) return false;
  if (drag.type === 'subject') return parentId === null;
  if (parentId === null) return false;
  const parent = folders.find((f) => f.id === parentId);
  if (!parent || parent.type === 'chapter') return false;
  if (parentId === dragId || descendantIds(folders, dragId).includes(parentId)) return false;
  return true;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  folders: [],
  activeId: null,
  renamingId: null,
  theme: 'light',

  init: async () => {
    const stored = localStorage.getItem('studytool.theme') as Theme | null;
    const theme: Theme =
      stored ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);
    const folders = await db.folders.toArray();
    const last = localStorage.getItem('studytool.active');
    const activeId = folders.some((f) => f.id === last && f.type === 'chapter') ? last : null;
    set({ folders, theme, activeId, ready: true });
  },

  createFolder: async (parentId, type) => {
    const siblings = childrenOf(get().folders, parentId);
    const folder: Folder = {
      id: uid(),
      parentId,
      name: DEFAULT_NAMES[type],
      type,
      order: siblings.length ? siblings[siblings.length - 1].order + 1 : 0,
    };
    await db.transaction('rw', db.folders, db.chapters, async () => {
      await db.folders.add(folder);
      if (type === 'chapter') await db.chapters.add(emptyChapter(folder.id));
      if (parentId) await db.folders.update(parentId, { collapsed: false });
    });
    set((s) => ({
      folders: [...s.folders.map((f) => (f.id === parentId ? { ...f, collapsed: false } : f)), folder],
      renamingId: folder.id,
    }));
    if (type === 'chapter') get().openChapter(folder.id);
    return folder.id;
  },

  renameFolder: async (id, name) => {
    const clean = name.trim();
    if (!clean) return;
    await db.folders.update(id, { name: clean });
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name: clean } : f)) }));
  },

  deleteFolder: async (id) => {
    const ids = [id, ...descendantIds(get().folders, id)];
    await db.transaction('rw', db.folders, db.chapters, async () => {
      await db.chapters.where('folderId').anyOf(ids).delete();
      await db.folders.bulkDelete(ids);
    });
    const { activeId } = get();
    if (activeId && ids.includes(activeId)) get().openChapter(null);
    set((s) => ({ folders: s.folders.filter((f) => !ids.includes(f.id)) }));
  },

  toggleCollapse: async (id) => {
    const f = get().folders.find((x) => x.id === id);
    if (!f) return;
    const collapsed = !f.collapsed;
    await db.folders.update(id, { collapsed });
    set((s) => ({ folders: s.folders.map((x) => (x.id === id ? { ...x, collapsed } : x)) }));
  },

  moveFolder: async (id, parentId, index) => {
    const { folders } = get();
    if (!canMove(folders, id, parentId)) return;
    const moving = folders.find((f) => f.id === id)!;
    const siblings = childrenOf(folders, parentId).filter((f) => f.id !== id);
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, moving);
    const updates = new Map(siblings.map((f, i) => [f.id, { ...f, parentId, order: i }]));
    await db.folders.bulkPut([...updates.values()]);
    set({ folders: folders.map((f) => updates.get(f.id) ?? f) });
  },

  openChapter: (id) => {
    if (id) localStorage.setItem('studytool.active', id);
    else localStorage.removeItem('studytool.active');
    set({ activeId: id });
  },

  setRenaming: (id) => set({ renamingId: id }),

  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('studytool.theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));
