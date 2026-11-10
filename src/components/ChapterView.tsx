import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useChapterStore } from '../store/chapterStore';
import type { Folder } from '../types';
import NotesPage from '../features/notes/NotesPage';
import KnowledgeWeb from '../features/web/KnowledgeWeb';

const TABS = [
  { id: 'web', label: 'Knowledge Web' },
  { id: 'notes', label: 'Notes' },
  { id: 'bank', label: 'Question Bank' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function pathOf(folders: Folder[], id: string): string[] {
  const out: string[] = [];
  let cur = folders.find((f) => f.id === id);
  while (cur) {
    out.unshift(cur.name);
    const parentId: string | null = cur.parentId;
    cur = parentId ? folders.find((f) => f.id === parentId) : undefined;
  }
  return out;
}

export function ChapterView() {
  const activeId = useAppStore((s) => s.activeId);
  const folders = useAppStore((s) => s.folders);
  const chapter = useChapterStore((s) => s.chapter);
  const status = useChapterStore((s) => s.status);
  const [tab, setTab] = useState<TabId>('web');

  useEffect(() => {
    void useChapterStore.getState().load(activeId);
  }, [activeId]);

  if (!activeId) {
    return (
      <div className="empty">
        <div className="text-4xl">📖</div>
        <div className="text-base font-medium text-ink">No chapter open</div>
        <p className="max-w-xs">
          Create a subject in the sidebar, add a chapter to it, then open the chapter to see its Knowledge Web, Notes and
          Question Bank.
        </p>
      </div>
    );
  }

  if (!chapter || chapter.folderId !== activeId) return <div className="empty">Loading…</div>;

  const path = pathOf(folders, activeId);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="print-hide flex shrink-0 items-end justify-between gap-4 border-b border-line bg-surface px-5 pt-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-muted">{path.slice(0, -1).join(' / ')}</div>
          <div className="mb-2 truncate text-lg font-semibold leading-tight">{path[path.length - 1]}</div>
          <div className="flex gap-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                  tab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pb-3 text-xs text-muted" aria-live="polite">
          {status === 'saving' ? 'Saving…' : '✓ Saved'}
        </div>
      </header>

      <div className="min-h-0 flex-1" key={chapter.id}>
        {tab === 'web' && <KnowledgeWeb />}
        {tab === 'notes' && <NotesPage />}
        {tab === 'bank' && <div className="empty">Question Bank</div>}
      </div>
    </div>
  );
}
