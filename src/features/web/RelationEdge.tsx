import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { Relation } from '../../types';
import { relationColor } from '../../config/relationTypes';
import { useWebStore } from './webStore';

function RelationEdgeImpl(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected, data } = props;
  const relation = (data as { relation: Relation }).relation;
  const color = relationColor(relation.type);
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

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
