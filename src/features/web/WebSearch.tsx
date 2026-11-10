import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { Point } from '../../types';
import { htmlToText } from '../../lib/html';
import { Icon } from '../../components/Icon';

interface Props {
  points: Point[];
  onPick: (id: string) => void;
}

/** Fuzzy search over point titles and text. */
export function WebSearch({ points, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(
        points.map((p) => ({ id: p.id, title: p.title, text: htmlToText(p.text) })),
        { keys: [{ name: 'title', weight: 2 }, 'text'], threshold: 0.4, ignoreLocation: true },
      ),
    [points],
  );
  const results = useMemo(() => (query.trim() ? fuse.search(query.trim()).slice(0, 8) : []), [fuse, query]);
  const open = focused && query.trim().length > 0;

  return (
    <div className="relative w-64">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 shadow-md focus-within:border-accent">
        <Icon name="search" size={14} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) onPick(results[0].item.id);
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          placeholder="Search points…"
          aria-label="Search points"
          className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
        />
      </div>
      {open && (
        <ul className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">No matching points</li>
          ) : (
            results.map(({ item }) => (
              <li key={item.id}>
                <button
                  className="block w-full px-3 py-1.5 text-left hover:bg-panel"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(item.id)}
                >
                  <div className="truncate text-sm font-medium">{item.title || 'Untitled'}</div>
                  {item.text && <div className="truncate text-xs text-muted">{item.text}</div>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
