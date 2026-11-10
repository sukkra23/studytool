import { memo, useMemo, useState } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import type { Point } from '../../types';
import { htmlToText, sanitizeHtml } from '../../lib/html';
import { BlobImg } from '../../components/BlobImg';
import { Icon } from '../../components/Icon';
import { useWebStore } from './webStore';

export const HANDLES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
];

function PointNodeImpl({ id, data, selected, dragging }: NodeProps) {
  const point = (data as { point: Point }).point;
  const [hover, setHover] = useState(false);
  const highlighted = useWebStore((s) => s.highlightId === id);
  const plain = useMemo(() => htmlToText(point.text), [point.text]);
  const html = useMemo(() => sanitizeHtml(point.text), [point.text]);
  const hasDetails = plain.length > 0 || point.images.length > 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`min-w-[120px] max-w-[220px] rounded-lg border-2 bg-surface px-3 py-2 shadow-sm transition-colors ${
        selected ? 'border-accent' : 'border-line'
      } ${highlighted ? 'point-highlight' : ''}`}
      data-point-title={point.title}
    >
      <NodeToolbar isVisible={hover && !dragging && hasDetails} position={Position.Right} offset={14}>
        <div
          role="tooltip"
          className="pointer-events-none max-h-[70vh] w-80 overflow-hidden rounded-lg border border-line bg-surface p-3 text-left text-sm text-ink shadow-xl"
        >
          <div className="mb-1 font-semibold">{point.title || 'Untitled'}</div>
          {plain && <div className="prose-lite text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />}
          {point.images.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {point.images.map((img) => (
                <BlobImg key={img} id={img} className="max-h-56 w-full rounded border border-line object-contain" />
              ))}
            </div>
          )}
        </div>
      </NodeToolbar>

      {HANDLES.map((h) => (
        <Handle key={h.id} id={h.id} type="source" position={h.position} className="web-handle" />
      ))}

      <div className="break-words text-sm font-semibold leading-snug">{point.title || 'Untitled'}</div>
      {plain && <div className="mt-0.5 line-clamp-2 break-words text-xs text-muted">{plain}</div>}
      {point.images.length > 0 && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Icon name="image" size={12} /> {point.images.length}
        </div>
      )}
    </div>
  );
}

export const PointNode = memo(PointNodeImpl);
