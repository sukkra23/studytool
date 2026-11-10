/** Question Bank sections. `defaultMarks` pre-fills the form and blank CSV cells. */
export const SECTIONS = [
  { id: 'mcq', label: 'MCQ', short: 'MCQ', defaultMarks: 1, hasOptions: true },
  { id: 'vsa', label: 'Very Short Answer (2M)', short: 'Very Short Answer', defaultMarks: 2, hasOptions: false },
  { id: 'sa', label: 'Short Answer (3M)', short: 'Short Answer', defaultMarks: 3, hasOptions: false },
  { id: 'la', label: 'Long Answer (5M)', short: 'Long Answer', defaultMarks: 5, hasOptions: false },
  { id: 'case', label: 'Case Based (4M)', short: 'Case Based', defaultMarks: 4, hasOptions: false },
  { id: 'hots', label: 'HOTs (3M)', short: 'HOTs', defaultMarks: 3, hasOptions: false },
  { id: 'competitive', label: 'Competitive Exam Problems', short: 'Competitive Exam Problems', defaultMarks: 4, hasOptions: false },
  { id: 'other', label: 'Other', short: 'Other', defaultMarks: 1, hasOptions: false },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
export type Section = (typeof SECTIONS)[number];

export function getSection(id: string): Section {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[SECTIONS.length - 1];
}
