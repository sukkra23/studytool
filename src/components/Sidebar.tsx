import { useEffect, useRef, useState, type DragEvent } from 'react';
import { canMove, childrenOf, descendantIds, useAppStore } from '../store/appStore';
import type { Folder } from '../types';
import { Icon } from './Icon';
import { confirm } from './ConfirmDialog';
import { BackupButtons } from '../features/backup/BackupButtons';

type DropZone = 'before' | 'after' | 'inside';
interface DropTarget {
  id: string;
  zone: DropZone;
}

// Module-level because dataTransfer contents are not readable during dragover.
let draggingId: string | null = null;

export function Sidebar() {
  const folders = useAppStore((s) => s.folders);
  const createFolder = useAppStore((s) => s.createFolder);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const subjects = childrenOf(folders, null);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-line bg-panel/60">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">📚 Study Tool</span>
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button className="btn w-full" onClick={() => void createFolder(null, 'subject')}>
          <Icon name="plus" /> New Subject
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" onDragLeave={() => setDrop(null)}>
        {subjects.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs leading-relaxed text-muted">
            No subjects yet.
            <br />
            Create one to start adding chapters.
          </div>
        ) : (
          subjects.map((f) => <TreeNode key={f.id} folder={f} depth={0} drop={drop} setDrop={setDrop} />)
        )}
      </nav>

      <div className="border-t border-line p-3">
        <BackupButtons />
      </div>
    </aside>
  );
}

interface NodeProps {
  folder: Folder;
  depth: number;
  drop: DropTarget | null;
  setDrop: (d: DropTarget | null) => void;
}

function TreeNode({ folder, depth, drop, setDrop }: NodeProps) {
  const folders = useAppStore((s) => s.folders);
  const activeId = useAppStore((s) => s.activeId);
  const renamingId = useAppStore((s) => s.renamingId);
  const { createFolder, renameFolder, deleteFolder, toggleCollapse, moveFolder, openChapter, setRenaming } =
    useAppStore.getState();

  const isContainer = folder.type !== 'chapter';
  const children = isContainer ? childrenOf(folders, folder.id) : [];
  const renaming = renamingId === folder.id;
  const active = activeId === folder.id;
  const dropHere = drop?.id === folder.id ? drop.zone : null;

  const zoneFor = (e: DragEvent): DropZone | null => {
    if (!draggingId || draggingId === folder.id) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const sibling = canMove(folders, draggingId, folder.parentId);
    const inside = isContainer && canMove(folders, draggingId, folder.id);
    if (inside && (!sibling || (ratio > 0.28 && ratio < 0.72))) return 'inside';
    if (sibling) return ratio < 0.5 ? 'before' : 'after';
    return null;
  };

  const onDragOver = (e: DragEvent) => {
    const zone = zoneFor(e);
    if (!zone) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (drop?.id !== folder.id || drop.zone !== zone) setDrop({ id: folder.id, zone });
  };

  const onDrop = (e: DragEvent) => {
    const zone = zoneFor(e);
    const id = draggingId;
    setDrop(null);
    if (!zone || !id) return;
    e.preventDefault();
    e.stopPropagation();
    if (zone === 'inside') {
      void moveFolder(id, folder.id, children.length);
    } else {
      const siblings = childrenOf(folders, folder.parentId).filter((f) => f.id !== id);
      const idx = siblings.findIndex((f) => f.id === folder.id) + (zone === 'after' ? 1 : 0);
      void moveFolder(id, folder.parentId, idx);
    }
  };

  const onDelete = async () => {
    const inside = descendantIds(folders, folder.id).length;
    const ok = await confirm({
      title: `Delete "${folder.name}"?`,
      message:
        folder.type === 'chapter'
          ? 'Its Knowledge Web, Notes and Question Bank will be permanently deleted.'
          : inside > 0
            ? `This also permanently deletes the ${inside} item${inside === 1 ? '' : 's'} inside it.`
            : 'This cannot be undone.',
    });
    if (ok) await deleteFolder(folder.id);
  };

  return (
    <div>
      <div
        draggable={!renaming}
        onDragStart={(e) => {
          draggingId = folder.id;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', folder.id);
          e.stopPropagation();
        }}
        onDragEnd={() => {
          draggingId = null;
          setDrop(null);
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => (isContainer ? void toggleCollapse(folder.id) : openChapter(folder.id))}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setRenaming(folder.id);
        }}
        style={{ paddingLeft: 6 + depth * 14 }}
        className={`group relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md pr-1 text-sm ${
          active ? 'bg-accent/15 font-medium text-accent' : 'hover:bg-line/50'
        } ${dropHere === 'inside' ? 'ring-2 ring-inset ring-accent' : ''}`}
        data-tree-item={folder.type}
        title={folder.name}
      >
        {dropHere === 'before' && <div className="pointer-events-none absolute inset-x-1 top-0 h-0.5 bg-accent" />}
        {dropHere === 'after' && <div className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 bg-accent" />}

        {isContainer ? (
          <Icon name="chevron" size={12} className={`text-muted transition-transform ${folder.collapsed ? '' : 'rotate-90'}`} />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon name={folder.type} size={15} className={active ? '' : 'text-muted'} />

        {renaming ? (
          <RenameInput
            initial={folder.name}
            onDone={(name) => {
              setRenaming(null);
              if (name !== null) void renameFolder(folder.id, name);
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        )}

        {!renaming && (
          <span className="hidden shrink-0 items-center group-hover:flex" onClick={(e) => e.stopPropagation()}>
            {isContainer && (
              <>
                <button className="btn-icon !h-6 !w-6" title="New chapter" onClick={() => void createFolder(folder.id, 'chapter')}>
                  <Icon name="filePlus" size={14} />
                </button>
                <button className="btn-icon !h-6 !w-6" title="New folder" onClick={() => void createFolder(folder.id, 'folder')}>
                  <Icon name="folderPlus" size={14} />
                </button>
              </>
            )}
            <button className="btn-icon !h-6 !w-6" title="Rename" onClick={() => setRenaming(folder.id)}>
              <Icon name="edit" size={14} />
            </button>
            <button className="btn-icon !h-6 !w-6 hover:!text-red-500" title="Delete" onClick={() => void onDelete()}>
              <Icon name="trash" size={14} />
            </button>
          </span>
        )}
      </div>

      {isContainer && !folder.collapsed && (
        <div>
          {children.length === 0 ? (
            <div style={{ paddingLeft: 38 + depth * 14 }} className="py-1 text-xs italic text-muted/70">
              Empty
            </div>
          ) : (
            children.map((c) => <TreeNode key={c.id} folder={c} depth={depth + 1} drop={drop} setDrop={setDrop} />)
          )}
        </div>
      )}
    </div>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const finished = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (v: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(v);
  };
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value);
        if (e.key === 'Escape') finish(null);
      }}
      className="min-w-0 flex-1 rounded border border-accent bg-surface px-1 text-sm text-ink outline-none"
    />
  );
}
