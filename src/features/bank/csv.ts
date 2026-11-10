import Papa from 'papaparse';
import type { Question } from '../../types';
import { getSection, type SectionId } from '../../config/sections';
import { uid } from '../../lib/id';

export const CSV_COLUMNS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'marks'] as const;
const OPTION_COLUMNS = ['option_a', 'option_b', 'option_c', 'option_d'] as const;

export interface CsvError {
  /** 1-based row in the file; the header is row 1. 0 = problem with the whole file. */
  row: number;
  reason: string;
}

export interface CsvResult {
  questions: Question[];
  errors: CsvError[];
}

/**
 * Parse and validate a question CSV for one section.
 * Valid rows become questions; every invalid row is reported with its row number and the reason.
 */
export function parseQuestionCsv(text: string, sectionId: SectionId): CsvResult {
  const section = getSection(sectionId);
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ''), { header: false, skipEmptyLines: false });
  const rows = parsed.data;
  const errors: CsvError[] = [];
  const questions: Question[] = [];

  for (const e of parsed.errors) {
    if (e.code === 'UndetectableDelimiter') continue;
    errors.push({ row: (e.row ?? 0) + 1, reason: `CSV syntax problem: ${e.message}` });
  }

  const isBlank = (r: string[] | undefined) => !r || r.every((c) => !String(c ?? '').trim());
  if (rows.every(isBlank)) return { questions, errors: [{ row: 0, reason: 'The file is empty.' }] };

  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = Object.fromEntries(CSV_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<(typeof CSV_COLUMNS)[number], number>;
  const missing = (['question', 'marks'] as const).filter((c) => col[c] === -1);
  if (section.hasOptions) missing.push(...(OPTION_COLUMNS.filter((c) => col[c] === -1) as never[]));
  if (missing.length) {
    return {
      questions,
      errors: [
        { row: 1, reason: `Header row is missing column(s): ${missing.join(', ')}. Expected: ${CSV_COLUMNS.join(',')}` },
      ],
    };
  }

  const cell = (r: string[], c: (typeof CSV_COLUMNS)[number]) => (col[c] === -1 ? '' : String(r[col[c]] ?? '').trim());

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (isBlank(r)) continue;
    const row = i + 1;
    const problems: string[] = [];

    const question = cell(r, 'question');
    if (!question) problems.push('question is empty');

    const marksRaw = cell(r, 'marks');
    let marks: number = section.defaultMarks;
    if (marksRaw) {
      marks = Number(marksRaw);
      if (!Number.isFinite(marks) || marks <= 0) problems.push(`marks must be a positive number (got "${marksRaw}")`);
    }

    let options: string[] | undefined;
    if (section.hasOptions) {
      const raw = OPTION_COLUMNS.map((c) => cell(r, c));
      const lastFilled = raw.reduce((last, v, idx) => (v ? idx : last), -1);
      if (lastFilled < 1) problems.push('an MCQ needs at least 2 options (option_a and option_b)');
      else {
        const gap = raw.slice(0, lastFilled).findIndex((v) => !v);
        if (gap !== -1) problems.push(`${OPTION_COLUMNS[gap]} is empty but a later option is filled in`);
      }
      options = raw.slice(0, lastFilled + 1);
    }

    if (problems.length) errors.push({ row, reason: problems.join('; ') });
    else questions.push({ id: uid(), sectionType: sectionId, text: question, options, marks, source: 'csv' });
  }

  if (!questions.length && !errors.length) errors.push({ row: 0, reason: 'No question rows found below the header.' });
  return { questions, errors: errors.sort((a, b) => a.row - b.row) };
}

/** Template CSV with the right header and two example rows for the section. */
export function templateCsv(sectionId: SectionId): string {
  const section = getSection(sectionId);
  const rows = section.hasOptions
    ? [
        ['Which organelle is known as the powerhouse of the cell?', 'Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body', section.defaultMarks],
        ['What is the SI unit of force?', 'Joule', 'Pascal', 'Newton', 'Watt', section.defaultMarks],
      ]
    : [
        ['Write your first question here.', '', '', '', '', section.defaultMarks],
        ['Questions containing commas, "quotes" or line breaks are fine.', '', '', '', '', section.defaultMarks],
      ];
  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows });
}
