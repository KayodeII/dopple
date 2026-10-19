import type { LessonBlock } from '@/lib/learn';

/**
 * How a lesson looks: a colour and a big decorative glyph per subject, so a child can tell
 * maths from English at a glance. Class names are written out in full for Tailwind.
 */
const THEMES = {
  maths: { bg: 'bg-sun', soft: 'bg-sun/15', dot: 'bg-sun', glyph: '÷' },
  numbers: { bg: 'bg-mint', soft: 'bg-mint/15', dot: 'bg-mint', glyph: '3' },
  english: { bg: 'bg-sky', soft: 'bg-sky/15', dot: 'bg-sky', glyph: 'Aa' },
  letters: { bg: 'bg-pink', soft: 'bg-pink/15', dot: 'bg-pink', glyph: 'b' },
  other: { bg: 'bg-violet', soft: 'bg-violet/15', dot: 'bg-violet', glyph: '✦' },
} as const;

export type SubjectTheme = (typeof THEMES)[keyof typeof THEMES];

export function subjectTheme(subject: string): SubjectTheme {
  if (subject === 'early-numeracy') return THEMES.numbers;
  if (subject === 'early-literacy') return THEMES.letters;
  if (subject.includes('mathematics')) return THEMES.maths;
  if (subject.startsWith('english')) return THEMES.english;
  return THEMES.other;
}

export interface LessonSection {
  /** Anchor for the lesson map; null for the opening paragraphs before the first heading. */
  id: string | null;
  /** The step number shown beside the heading. */
  step: number;
  title: string | null;
  blocks: LessonBlock[];
}

/** Splits the blocks at each heading, so every heading starts a numbered step. */
export function toSections(blocks: LessonBlock[]): LessonSection[] {
  const sections: LessonSection[] = [
    { id: null, step: 0, title: null, blocks: [] },
  ];
  for (const block of blocks) {
    if (block.type === 'h') {
      const step = sections.length;
      sections.push({ id: `step-${step}`, step, title: block.text, blocks: [] });
    } else {
      sections.at(-1)!.blocks.push(block);
    }
  }
  return sections.filter((s) => s.title || s.blocks.length);
}

/** All the words in a section, in reading order, for the read-aloud button. */
export function sectionText(section: LessonSection): string {
  const parts = section.title ? [section.title] : [];
  for (const block of section.blocks) {
    if (block.type === 'list') parts.push(...block.items);
    else if (block.type === 'example') parts.push(block.title, ...block.steps);
    else parts.push(block.text);
  }
  return parts.join('. ').replace(/\.\s*\./g, '.');
}

/** "Principal (P): the money saved" → a bold term and the rest. Short terms only. */
export function splitTerm(item: string): [string | null, string] {
  const at = item.indexOf(': ');
  if (at > 0 && at <= 32) return [item.slice(0, at), item.slice(at + 2)];
  return [null, item];
}
