import Dexie, { type Table } from 'dexie';
import type { Chapter, Folder, ImageRecord } from '../types';
import { uid } from '../lib/id';

class StudyDB extends Dexie {
  folders!: Table<Folder, string>;
  chapters!: Table<Chapter, string>;
  images!: Table<ImageRecord, string>;

  constructor() {
    super('studytool');
    this.version(1).stores({
      folders: 'id, parentId',
      chapters: 'id, &folderId',
      images: 'id',
    });
  }
}

export const db = new StudyDB();

export function emptyChapter(folderId: string): Chapter {
  return {
    id: uid(),
    folderId,
    web: { points: [], boxes: [], relations: [] },
    notes: { title: '', doc: null },
    questionBank: [],
  };
}
