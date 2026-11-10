import { useState } from 'react';
import { RELATION_COLORS, RELATION_TYPES } from '../../config/relationTypes';

export function Legend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-44 rounded-lg border border-line bg-surface/95 text-xs shadow-md" data-legend>
      <button
        className="flex w-full items-center justify-between px-3 py-2 font-semibold"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Relation types <span className="text-muted">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="max-h-[45vh] overflow-y-auto border-t border-line px-3 py-2">
          {RELATION_TYPES.map((t) => (
            <li key={t} className="flex items-center gap-2 py-0.5 capitalize">
              <span className="h-1 w-6 shrink-0 rounded-full" style={{ background: RELATION_COLORS[t] }} />
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
