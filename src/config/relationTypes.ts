/**
 * Relation types for Knowledge Web arrows and the colour each one is drawn in.
 * EDIT THIS MAP to change colours or add/remove types - the legend, the arrow
 * editor and the arrows themselves all read from here.
 */
export const RELATION_COLORS = {
  structure: '#3b82f6',
  function: '#10b981',
  derivation: '#8b5cf6',
  equation: '#f59e0b',
  exception: '#ef4444',
  example: '#06b6d4',
  application: '#84cc16',
  definition: '#6366f1',
  cause: '#f97316',
  effect: '#ec4899',
  setting: '#14b8a6',
  theme: '#a855f7',
  mood: '#eab308',
  tone: '#64748b',
  'poetic devices': '#d946ef',
} as const;

export type RelationType = keyof typeof RELATION_COLORS;

export const RELATION_TYPES = Object.keys(RELATION_COLORS) as RelationType[];

export function relationColor(type: string): string {
  return (RELATION_COLORS as Record<string, string>)[type] ?? '#94a3b8';
}
