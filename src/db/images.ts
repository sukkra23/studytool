import { useEffect, useState } from 'react';
import { db } from './db';
import { uid } from '../lib/id';
import type { Chapter } from '../types';

const urlCache = new Map<string, string>();

/** Store an image Blob in IndexedDB and return its id. */
export async function saveImage(blob: Blob): Promise<string> {
  const id = uid();
  await db.images.put({ id, blob });
  return id;
}

export async function getImageUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const rec = await db.images.get(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  urlCache.set(id, url);
  return url;
}

/** Object URL for a stored image, or null while loading / if missing. */
export function useImageUrl(id: string): string | null {
  const [url, setUrl] = useState<string | null>(urlCache.get(id) ?? null);
  useEffect(() => {
    let alive = true;
    void getImageUrl(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

function collectDocImages(node: unknown, out: Set<string>) {
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; attrs?: { imageId?: string }; content?: unknown[] };
  if (n.type === 'blobImage' && n.attrs?.imageId) out.add(n.attrs.imageId);
  n.content?.forEach((c) => collectDocImages(c, out));
}

export function chapterImageIds(ch: Chapter): Set<string> {
  const ids = new Set<string>();
  ch.web.points.forEach((p) => p.images.forEach((i) => ids.add(i)));
  collectDocImages(ch.notes.doc, ids);
  return ids;
}

/** Delete images no chapter refers to any more. Run at startup (undo history is gone by then). */
export async function sweepOrphanImages() {
  const used = new Set<string>();
  await db.chapters.each((ch) => chapterImageIds(ch).forEach((i) => used.add(i)));
  const all = await db.images.toCollection().primaryKeys();
  const orphans = all.filter((id) => !used.has(id));
  if (orphans.length) await db.images.bulkDelete(orphans);
}
