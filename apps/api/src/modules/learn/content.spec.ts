import { readdirSync, readFileSync } from 'node:fs';
import { CLASS_SLUGS, parseContent } from './content.js';

const root = new URL('../../../../../content/learn/', import.meta.url);
const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, root), 'utf8'));

const topic = (overrides: Record<string, unknown> = {}) => ({
  slug: 'primary-4-test',
  class: 'primary-4',
  subject: 'mathematics',
  position: 1,
  title: 'Test',
  summary: 'Test',
  minutes: 10,
  lesson: [{ type: 'p', text: 'Hello' }],
  questions: Array.from({ length: 3 }, () => ({
    prompt: 'Q?',
    options: ['a', 'b', 'c', 'd'],
    answer: 0,
    explanation: 'Because.',
  })),
  ...overrides,
});
const subjects = [
  { slug: 'mathematics', name: 'Mathematics', classes: ['primary-4'] },
];

describe('Learn content', () => {
  it('lists every class from Nursery 1 to SS 3 in order', () => {
    expect(CLASS_SLUGS[0]).toBe('nursery-1');
    expect(CLASS_SLUGS).toContain('primary-6');
    expect(CLASS_SLUGS.at(-1)).toBe('ss-3');
    expect(CLASS_SLUGS).toHaveLength(14);
  });

  it('accepts everything in content/learn', () => {
    const files = readdirSync(new URL('topics/', root)).filter((f) =>
      f.endsWith('.json'),
    );
    const content = parseContent({
      subjects: read('subjects.json'),
      topics: files.map((f) => read(`topics/${f}`)),
    });
    expect(content.topics.length).toBeGreaterThan(0);
    for (const t of content.topics) {
      expect(t.slug.startsWith(`${t.class}-`)).toBe(true);
    }
  });

  it('refuses a question without exactly four options or with no answer among them', () => {
    const bad = topic({
      questions: [
        { prompt: 'Q?', options: ['a', 'b'], answer: 0, explanation: 'x' },
        {
          prompt: 'Q?',
          options: ['a', 'b', 'c', 'd'],
          answer: 4,
          explanation: 'x',
        },
        {
          prompt: 'Q?',
          options: ['a', 'b', 'c', 'd'],
          answer: 0,
          explanation: 'x',
        },
      ],
    });
    expect(() => parseContent({ subjects, topics: [bad] })).toThrow(
      /primary-4-test/,
    );
  });

  it('refuses a topic in a class its subject is not taught in', () => {
    expect(() =>
      parseContent({ subjects, topics: [topic({ class: 'jss-1' })] }),
    ).toThrow(/Mathematics is not taught in jss-1/);
  });

  it('refuses repeated slugs and positions, and unknown subjects', () => {
    expect(() =>
      parseContent({
        subjects,
        topics: [topic(), topic(), topic({ slug: 'p', subject: 'nope' })],
      }),
    ).toThrow(
      /slug used twice[\s\S]*position primary-4\/mathematics\/1 taken[\s\S]*unknown subject "nope"/,
    );
  });

  it('refuses lesson blocks it does not know, such as raw HTML', () => {
    expect(() =>
      parseContent({
        subjects,
        topics: [topic({ lesson: [{ type: 'html', text: '<script>' }] })],
      }),
    ).toThrow(/primary-4-test/);
  });
});
