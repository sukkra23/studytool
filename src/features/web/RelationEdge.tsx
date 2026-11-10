import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react';
import type { Relation } from '../../types';
import { relationColor } from '../../config/relationTypes';
import { useWebStore } from './webStore';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rectOf = (n: InternalNode): Rect => ({
  x: n.internals.positionAbsolute.x,
  y: n.internals.positionAbsolute.y,
  w: n.measured.width ?? 0,
  h: n.measured.height ?? 0,
});

const anchor = (r: Rect, side: Position) => {
  if (side === Position.Left) return { x: r.x, y: r.y + r.h / 2 };
  if (side === Position.Right) return { x: r.x + r.w, y: r.y + r.h / 2 };
  if (side === Position.Top) return { x: r.x + r.w / 2, y: r.y };
  return { x: r.x + r.w / 2, y: r.y + r.h };
};

/** Arrows attach to whichever sides of the two items face each other, so they stay tidy as things move. */
function facingSides(a: Rect, b: Rect): [Position, Position] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const gapX = Math.abs(dx) - (a.w + b.w) / 2;
  const gapY = Math.abs(dy) - (a.h + b.h) / 2;
  if (gapX >= gapY) return dx >= 0 ? [Position.Right, Position.Left] : [Position.Left, Position.Right];
  return dy >= 0 ? [Position.Bottom, Position.Top] : [Position.Top, Position.Bottom];
}

function RelationEdgeImpl({ id, source, target, markerEnd, selected, data }: EdgeProps) {
  const relation = (data as { relation: Relation }).relation;
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const a = rectOf(sourceNode);
  const b = rectOf(targetNode);
  const [sourcePosition, targetPosition] = facingSides(a, b);
  const s = anchor(a, sourcePosition);
  const t = anchor(b, targetPosition);
  const color = relationColor(relation.type);
  const [path, labelX, labelY] = getBezierPath({
    sourceX: s.x,
    sourceY: s.y,
    targetX: t.x,
    targetY: t.y,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{ stroke: color, strokeWidth: selected ? 3.5 : 2 }}
      />
      <EdgeLabelRenderer>
        <div
          className={`nodrag nopan absolute max-w-[220px] cursor-pointer rounded-full border-2 bg-surface px-2 py-0.5 text-center text-[11px] font-medium leading-tight text-ink shadow-sm ${
            selected ? 'ring-2 ring-accent/40' : ''
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            borderColor: color,
            zIndex: 1500,
          }}
          title={`${relation.type} — double-click to edit`}
          onDoubleClick={() => useWebStore.setState({ relationDraft: { ...relation, isNew: false } })}
          data-relation-type={relation.type}
        >
          {relation.label || <span style={{ color }}>{relation.type}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RelationEdge = memo(RelationEdgeImpl);
