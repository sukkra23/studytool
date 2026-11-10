import { db } from '../../db/db';
import { useChapterStore } from '../../store/chapterStore';
import type { Chapter, Folder } from '../../types';

const APP_ID = 'studytool';
const VERSION = 1;

interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  folders: Folder[];
  chapters: Chapter[];
  /** Image Blobs encoded as base64. */
  images: { id: string; type: string; data: string }[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Everything in the database as one JSON file. */
export async function exportBackup(): Promise<Blob> {
  await useChapterStore.getState().flush();
  const [folders, chapters, images] = await Promise.all([db.folders.toArray(), db.chapters.toArray(), db.images.toArray()]);
  const file: BackupFile = {
    app: APP_ID,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    folders,
    chapters,
    images: await Promise.all(images.map(async (i) => ({ id: i.id, type: i.blob.type, data: await blobToBase64(i.blob) }))),
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export interface BackupSummary {
  subjects: number;
  chapters: number;
  images: number;
  exportedAt: string;
}

/** Parse and validate a backup file without touching the database. Throws with a readable message. */
export function readBackup(text: string): { file: BackupFile; summary: BackupSummary } {
  let file: BackupFile;
  try {
    file = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!file || file.app !== APP_ID) throw new Error('This is not a Study Tool backup file.');
  if (typeof file.version !== 'number' || file.version > VERSION)
    throw new Error('This backup was made by a newer version of Study Tool.');
  if (!Array.isArray(file.folders) || !Array.isArray(file.chapters) || !Array.isArray(file.images))
    throw new Error('The backup file is incomplete or damaged.');
  const okFolder = (f: Folder) =>
    f && typeof f.id === 'string' && typeof f.name === 'string' && ['subject', 'folder', 'chapter'].includes(f.type);
  const okChapter = (c: Chapter) =>
    c &&
    typeof c.id === 'string' &&
    typeof c.folderId === 'string' &&
    Array.isArray(c.web?.points) &&
    Array.isArray(c.web?.boxes) &&
    Array.isArray(c.web?.relations) &&
    typeof c.notes === 'object' &&
    Array.isArray(c.questionBank);
  if (!file.folders.every(okFolder) || !file.chapters.every(okChapter))
    throw new Error('The backup file contains entries this app cannot read.');
  return {
    file,
    summary: {
      subjects: file.folders.filter((f) => f.type === 'subject').length,
      chapters: file.folders.filter((f) => f.type === 'chapter').length,
      images: file.images.length,
      exportedAt: file.exportedAt,
    },
  };
}

/** Replace ALL current data with the backup's contents (one transaction: all or nothing). */
export async function restoreBackup(file: BackupFile): Promise<void> {
  const images = file.images.map((i) => ({ id: i.id, blob: base64ToBlob(i.data, i.type) }));
  await useChapterStore.getState().load(null);
  await db.transaction('rw', db.folders, db.chapters, db.images, async () => {
    await Promise.all([db.folders.clear(), db.chapters.clear(), db.images.clear()]);
    await db.folders.bulkAdd(file.folders);
    await db.chapters.bulkAdd(file.chapters);
    await db.images.bulkAdd(images);
  });
}
