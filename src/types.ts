import type { RelationType } from './config/relationTypes';
import type { SectionId } from './config/sections';

export type FolderType = 'subject' | 'folder' | 'chapter';

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  type: FolderType;
  /** Position among siblings. */
  order: number;
  collapsed?: boolean;
}

export interface Point {
  id: string;
  title: string;
  /** Rich text, stored as HTML. */
  text: string;
  /** Ids of rows in the `images` table. */
  images: string[];
  boxId: string | null;
  /** Canvas position; relative to the box's top-left corner when boxId is set. */
  x: number;
  y: number;
}

export interface Box {
  id: string;
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Relation {
  id: string;
  /** Point or box id. */
  from: string;
  to: string;
  type: RelationType;
  label: string;
}

export interface WebData {
  points: Point[];
  boxes: Box[];
  relations: Relation[];
}

export interface NotesData {
  title: string;
  /** TipTap document JSON. */
  doc: unknown | null;
}

export interface Question {
  id: string;
  sectionType: SectionId;
  text: string;
  options?: string[];
  marks: number;
  source: 'csv' | 'manual';
}

export interface Chapter {
  id: string;
  folderId: string;
  web: WebData;
  notes: NotesData;
  questionBank: Question[];
}

export interface ImageRecord {
  id: string;
  blob: Blob;
}
