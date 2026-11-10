import type { Box, Point, Relation, WebData } from '../../types';
import { uid } from '../../lib/id';

/** Pure helpers: each takes a WebData and returns a new one. */

export function addPoint(web: WebData, x: number, y: number, init: Partial<Point> = {}): [WebData, Point] {
  const point: Point = { id: uid(), title: 'New point', text: '', images: [], boxId: null, x, y, ...init };
  return [{ ...web, points: [...web.points, point] }, point];
}

export function addBox(web: WebData, x: number, y: number): [WebData, Box] {
  const box: Box = { id: uid(), category: 'Category', x, y, w: 340, h: 240 };
  return [{ ...web, boxes: [...web.boxes, box] }, box];
}

export function updatePoint(web: WebData, id: string, patch: Partial<Point>): WebData {
  return { ...web, points: web.points.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function updateBox(web: WebData, id: string, patch: Partial<Box>): WebData {
  return { ...web, boxes: web.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
}

/** Resize a box; points inside keep their place on the canvas when the top/left edge moves. */
export function resizeBox(web: WebData, id: string, next: { x: number; y: number; w: number; h: number }): WebData {
  const old = web.boxes.find((b) => b.id === id);
  if (!old) return web;
  const dx = old.x - next.x;
  const dy = old.y - next.y;
  return {
    ...web,
    boxes: web.boxes.map((b) => (b.id === id ? { ...b, ...next } : b)),
    points: dx || dy ? web.points.map((p) => (p.boxId === id ? { ...p, x: p.x + dx, y: p.y + dy } : p)) : web.points,
  };
}

/** Delete points/boxes/relations. Points inside a deleted box are released onto the canvas. */
export function deleteItems(web: WebData, nodeIds: string[], relationIds: string[]): WebData {
  const gone = new Set(nodeIds);
  const goneRel = new Set(relationIds);
  const boxes = new Map(web.boxes.map((b) => [b.id, b]));
  return {
    boxes: web.boxes.filter((b) => !gone.has(b.id)),
    points: web.points
      .filter((p) => !gone.has(p.id))
      .map((p) => {
        if (!p.boxId || !gone.has(p.boxId)) return p;
        const box = boxes.get(p.boxId)!;
        return { ...p, boxId: null, x: p.x + box.x, y: p.y + box.y };
      }),
    relations: web.relations.filter((r) => !goneRel.has(r.id) && !gone.has(r.from) && !gone.has(r.to)),
  };
}

export function upsertRelation(web: WebData, rel: Relation): WebData {
  const exists = web.relations.some((r) => r.id === rel.id);
  return {
    ...web,
    relations: exists ? web.relations.map((r) => (r.id === rel.id ? rel : r)) : [...web.relations, rel],
  };
}

/** Absolute canvas position of a point. */
export function absolutePosition(web: WebData, p: Point): { x: number; y: number } {
  const box = p.boxId ? web.boxes.find((b) => b.id === p.boxId) : undefined;
  return box ? { x: p.x + box.x, y: p.y + box.y } : { x: p.x, y: p.y };
}
