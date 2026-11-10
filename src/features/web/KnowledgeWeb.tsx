import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WebData } from '../../types';
import { relationColor } from '../../config/relationTypes';
import { useAppStore } from '../../store/appStore';
import { useChapterStore } from '../../store/chapterStore';
import { saveImage } from '../../db/images';
import { imagesFromClipboard } from '../../lib/download';
import { uid } from '../../lib/id';
import { Icon } from '../../components/Icon';
import { confirm } from '../../components/ConfirmDialog';
import { isEditableTarget, isModalOpen } from '../../components/Modal';
import { absolutePosition, addBox, addPoint, deleteItems, updatePoint } from './actions';
import { getWeb, useWebStore } from './webStore';
import { PointNode } from './PointNode';
import { BoxNode } from './BoxNode';
import { RelationEdge } from './RelationEdge';
import { Legend } from './Legend';
import { WebSearch } from './WebSearch';
import { PointEditor } from './PointEditor';
import { RelationDialog } from './RelationDialog';

const nodeTypes = { point: PointNode, box: BoxNode };
const edgeTypes = { relation: RelationEdge };

/** Store data -> React Flow nodes. Selection and measured sizes carry over from the previous render. */
function buildNodes(web: WebData, prev: Node[]): Node[] {
  const old = new Map(prev.map((n) => [n.id, n]));
  const boxIds = new Set(web.boxes.map((b) => b.id));
  const boxes: Node[] = web.boxes.map((b) => ({
    id: b.id,
    type: 'box',
    position: { x: b.x, y: b.y },
    width: b.w,
    height: b.h,
    measured: { width: b.w, height: b.h },
    data: { box: b },
    selected: old.get(b.id)?.selected ?? false,
    zIndex: -1,
  }));
  const points: Node[] = web.points.map((p) => ({
    id: p.id,
    type: 'point',
    position: { x: p.x, y: p.y },
    parentId: p.boxId && boxIds.has(p.boxId) ? p.boxId : undefined,
    measured: old.get(p.id)?.measured,
    data: { point: p },
    selected: old.get(p.id)?.selected ?? false,
  }));
  // Parents must come before their children.
  return [...boxes, ...points];
}

function buildEdges(web: WebData, prev: Edge[]): Edge[] {
  const old = new Map(prev.map((e) => [e.id, e]));
  return web.relations.map((r) => ({
    id: r.id,
    source: r.from,
    target: r.to,
    type: 'relation',
    data: { relation: r },
    selected: old.get(r.id)?.selected ?? false,
    markerEnd: { type: MarkerType.ArrowClosed, color: relationColor(r.type), width: 18, height: 18 },
  }));
}

function WebCanvas() {
  const web = useChapterStore((s) => s.chapter!.web);
  const theme = useAppStore((s) => s.theme);
  const canUndo = useWebStore((s) => s.past.length > 0);
  const canRedo = useWebStore((s) => s.future.length > 0);
  const editingPointId = useWebStore((s) => s.editingPointId);
  const relationDraft = useWebStore((s) => s.relationDraft);
  const { commit, undo, redo } = useWebStore.getState();
  const rf = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();

  const [nodes, setNodes] = useState<Node[]>(() => buildNodes(web, []));
  const [edges, setEdges] = useState<Edge[]>(() => buildEdges(web, []));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // The chapter store is the source of truth; rebuild whenever it changes (edits, undo, redo).
  useEffect(() => {
    setNodes((prev) => buildNodes(web, prev));
    setEdges((prev) => buildEdges(web, prev));
  }, [web]);

  useEffect(() => {
    useWebStore.getState().resetHistory();
    return () => clearTimeout(highlightTimer.current);
  }, []);

  // Deletion goes through deleteSelected() so it can be confirmed and undone.
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes.filter((c) => c.type !== 'remove'), ns)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes.filter((c) => c.type !== 'remove'), es)),
    [],
  );

  const viewCenter = useCallback(() => {
    const rect = wrapper.current!.getBoundingClientRect();
    return rf.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [rf]);

  /** A free spot near the middle of the view, so new points never land exactly on top of each other. */
  const freeSpot = useCallback(() => {
    const c = viewCenter();
    const current = getWeb();
    const taken = current.points.map((p) => absolutePosition(current, p));
    let x = Math.round(c.x - 70);
    let y = Math.round(c.y - 25);
    while (taken.some((t) => Math.abs(t.x - x) < 24 && Math.abs(t.y - y) < 24)) {
      x += 28;
      y += 28;
    }
    return { x, y };
  }, [viewCenter]);

  const newPoint = useCallback(() => {
    const { x, y } = freeSpot();
    const [next, point] = addPoint(getWeb(), x, y);
    commit(next);
    useWebStore.setState({ editingPointId: point.id });
  }, [commit, freeSpot]);

  const newBox = useCallback(() => {
    const c = viewCenter();
    const [next] = addBox(getWeb(), c.x - 170, c.y - 120);
    commit(next);
  }, [commit, viewCenter]);

  const deleteSelected = useCallback(async () => {
    const nodeIds = nodesRef.current.filter((n) => n.selected).map((n) => n.id);
    const edgeIds = edgesRef.current.filter((e) => e.selected).map((e) => e.id);
    const count = nodeIds.length + edgeIds.length;
    if (!count) return;
    const ok = await confirm({
      title: `Delete ${count} selected item${count === 1 ? '' : 's'}?`,
      message: 'Arrows attached to deleted items are removed too. Points inside a deleted box are kept.\nYou can undo this with Ctrl+Z.',
    });
    if (ok) commit(deleteItems(getWeb(), nodeIds, edgeIds));
  }, [commit]);

  /** After a drag: save positions and move points into / out of boxes based on where they landed. */
  const onNodeDragStop = useCallback(
    (_: unknown, __: Node, dragged: Node[]) => {
      const current = getWeb();
      const moved = new Map(dragged.map((n) => [n.id, n]));
      const boxes = current.boxes.map((b) => {
        const d = moved.get(b.id);
        return d ? { ...b, x: d.position.x, y: d.position.y } : b;
      });
      const points = current.points.map((p) => {
        const d = moved.get(p.id);
        if (!d) return p;
        // Moving together with its box: the relative position is unchanged.
        if (p.boxId && moved.has(p.boxId)) return { ...p, x: d.position.x, y: d.position.y };
        const abs = rf.getInternalNode(p.id)?.internals.positionAbsolute ?? d.position;
        const w = d.measured?.width ?? 150;
        const h = d.measured?.height ?? 50;
        const cx = abs.x + w / 2;
        const cy = abs.y + h / 2;
        const box = [...boxes].reverse().find((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
        return box
          ? { ...p, boxId: box.id, x: abs.x - box.x, y: abs.y - box.y }
          : { ...p, boxId: null, x: abs.x, y: abs.y };
      });
      commit({ ...current, boxes, points });
    },
    [commit, rf],
  );

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    useWebStore.setState({
      relationDraft: {
        id: uid(),
        from: c.source,
        to: c.target,
        type: 'structure',
        label: '',
        isNew: true,
      },
    });
  }, []);

  /** Search result -> pan + zoom to the point and flash it. */
  const focusPoint = useCallback(
    (id: string) => {
      const internal = rf.getInternalNode(id);
      if (!internal) return;
      const { x, y } = internal.internals.positionAbsolute;
      const w = internal.measured?.width ?? 150;
      const h = internal.measured?.height ?? 50;
      void rf.setCenter(x + w / 2, y + h / 2, { zoom: 1.5, duration: 600 });
      useWebStore.setState({ highlightId: null });
      requestAnimationFrame(() => useWebStore.setState({ highlightId: id }));
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => useWebStore.setState({ highlightId: null }), 2600);
    },
    [rf],
  );

  // Keyboard shortcuts + Ctrl+V image paste on the canvas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || isModalOpen()) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        void deleteSelected();
      }
    };
    const onPaste = async (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || isModalOpen()) return;
      const files = imagesFromClipboard(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      const ids = await Promise.all(files.map((f) => saveImage(f)));
      const current = getWeb();
      const selected = nodesRef.current.filter((n) => n.selected && n.type === 'point');
      if (selected.length === 1) {
        const p = current.points.find((x) => x.id === selected[0].id);
        if (p) commit(updatePoint(current, p.id, { images: [...p.images, ...ids] }));
      } else {
        const { x, y } = freeSpot();
        const [next] = addPoint(current, x, y, { title: 'Pasted image', images: ids });
        commit(next);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [commit, deleteSelected, freeSpot, redo, undo]);

  const selectedCount = nodes.filter((n) => n.selected).length + edges.filter((e) => e.selected).length;
  const empty = web.points.length === 0 && web.boxes.length === 0;

  return (
    <div ref={wrapper} className="relative h-full w-full" data-web-canvas>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => node.type === 'point' && useWebStore.setState({ editingPointId: node.id })}
        onEdgeDoubleClick={(_, edge) => {
          const r = getWeb().relations.find((x) => x.id === edge.id);
          if (r) useWebStore.setState({ relationDraft: { ...r, isNew: false } });
        }}
        connectionMode={ConnectionMode.Loose}
        colorMode={theme}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={3}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => (n.type === 'box' ? 'rgba(99,102,241,0.18)' : '#6366f1')}
          nodeStrokeColor={(n) => (n.type === 'box' ? '#6366f1' : 'transparent')}
        />

        <Panel position="top-left" className="!m-3 flex flex-wrap items-center gap-2">
          <WebSearch points={web.points} onPick={focusPoint} />
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow-md">
            <button className="btn !border-0 !px-2 !py-1" onClick={newPoint} title="Add a point of information">
              <Icon name="plus" size={14} /> Point
            </button>
            <button className="btn !border-0 !px-2 !py-1" onClick={newBox} title="Add a category box">
              <Icon name="box" size={14} /> Box
            </button>
            <span className="mx-0.5 h-5 w-px bg-line" />
            <button className="btn-icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
              <Icon name="undo" />
            </button>
            <button className="btn-icon" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
              <Icon name="redo" />
            </button>
            <button
              className="btn-icon hover:!text-red-500"
              onClick={() => void deleteSelected()}
              disabled={selectedCount === 0}
              title="Delete selected (Del)"
              aria-label="Delete selected"
            >
              <Icon name="trash" />
            </button>
          </div>
        </Panel>

        <Panel position="top-right" className="!m-3">
          <Legend />
        </Panel>
      </ReactFlow>

      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm rounded-xl border border-dashed border-line bg-surface/80 p-6 text-center text-sm text-muted">
            <div className="mb-1 text-base font-medium text-ink">This web is empty</div>
            Add a <b>Point</b> for each idea and a <b>Box</b> for each category. Drag points into boxes, then drag from
            the dot on one item's edge to another to draw an arrow. Double-click a point or arrow to edit it.
          </div>
        </div>
      )}

      {editingPointId && <PointEditor key={editingPointId} pointId={editingPointId} />}
      {relationDraft && <RelationDialog key={relationDraft.id} />}
    </div>
  );
}

export default function KnowledgeWeb() {
  return (
    <ReactFlowProvider>
      <WebCanvas />
    </ReactFlowProvider>
  );
}
