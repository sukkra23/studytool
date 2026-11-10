import type { Question } from '../../types';
import { SECTIONS, type SectionId } from '../../config/sections';

export interface WorksheetGroup {
  letter: string;
  sectionId: SectionId;
  label: string;
  questions: Question[];
}

export type Counts = Record<SectionId, number>;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Randomly pick `counts[section]` distinct questions from each section. */
export function pickQuestions(questions: Question[], counts: Counts): WorksheetGroup[] {
  const groups: WorksheetGroup[] = [];
  for (const s of SECTIONS) {
    const pool = questions.filter((q) => q.sectionType === s.id);
    const n = Math.max(0, Math.min(Math.floor(counts[s.id] || 0), pool.length));
    if (n === 0) continue;
    groups.push({
      letter: String.fromCharCode(65 + groups.length),
      sectionId: s.id,
      label: s.short,
      questions: shuffle(pool).slice(0, n),
    });
  }
  return groups;
}

export function totalMarks(groups: WorksheetGroup[]): number {
  return groups.reduce((sum, g) => sum + g.questions.reduce((s, q) => s + q.marks, 0), 0);
}

export function sectionMarks(g: WorksheetGroup): number {
  return g.questions.reduce((s, q) => s + q.marks, 0);
}
