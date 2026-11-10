import { memo, useEffect, useState } from 'react';
import { Handle, NodeResizer, type NodeProps } from '@xyflow/react';
import type { Box } from '../../types';
import { HANDLES } from './PointNode';
import { resizeBox, updateBox } from './actions';
import { getWeb, useWebStore } from './webStore';

function BoxNodeImpl({ id, data, selected }: NodeProps) {
  const box = (data as { box: Box }).box;
  const [category, setCategory] = useState(box.category);
  useEffect(() => setCategory(box.category), [box.category]);

  const save = () => {
    const clean = category.trim() || 'Category';
    setCategory(clean);
    if (clean !== box.category) useWebStore.getState().commit(updateBox(getWeb(), id, { category: clean }));
  };

  return (
    <div
      className={`h-full w-full rounded-xl border-2 border-dashed bg-accent/5 ${
        selected ? 'border-accent' : 'border-muted/50'
      }`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        minHeight={120}
        lineClassName="!border-accent"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-accent !bg-surface"
        onResizeEnd={(_, p) =>
          useWebStore.getState().commit(resizeBox(getWeb(), id, { x: p.x, y: p.y, w: p.width, h: p.height }))
        }
      />
      {HANDLES.map((h) => (
        <Handle key={h.id} id={h.id} type="source" position={h.position} className="web-handle" />
      ))}
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="Category"
        aria-label="Box category"
        className="nodrag absolute left-3 top-2 w-[calc(100%-1.5rem)] truncate rounded bg-transparent px-1 text-xs font-bold uppercase tracking-wider text-accent outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}

export const BoxNode = memo(BoxNodeImpl);
