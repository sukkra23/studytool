import { useEffect, useRef } from 'react';
import { useSlashStore } from './slash';

const MENU_HEIGHT = 320;

export function SlashMenu() {
  const { open, items, index, rect, select } = useSlashStore();
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => active.current?.scrollIntoView({ block: 'nearest' }), [index]);
  if (!open || !rect) return null;

  const below = rect.bottom + MENU_HEIGHT + 12 < window.innerHeight;
  const style = below
    ? { left: rect.left, top: rect.bottom + 6 }
    : { left: rect.left, bottom: window.innerHeight - rect.top + 6 };

  return (
    <div
      role="listbox"
      data-slash-menu
      style={{ ...style, maxHeight: MENU_HEIGHT }}
      className="fixed z-50 w-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-xl"
    >
      {items.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted">No matching block</div>
      ) : (
        items.map((item, i) => (
          <button
            key={item.title}
            ref={i === index ? active : undefined}
            role="option"
            aria-selected={i === index}
            onMouseDown={(e) => {
              e.preventDefault();
              select(item);
            }}
            onMouseEnter={() => useSlashStore.setState({ index: i })}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left ${i === index ? 'bg-panel' : ''}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line bg-surface text-xs font-semibold">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="block truncate text-xs text-muted">{item.hint}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}
