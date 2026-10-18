import { z } from 'zod';

/**
 * Dopple Learn's content format (ADR 0011). Lessons live as JSON in content/learn/ and are
 * checked here before scripts/learn-load.mjs writes them to Postgres. Kept free of relative
 * imports so the loader can run this file directly with Node's type stripping.
 */

/** Classes from nursery to SS 3, in order (docs/research/nigeria-education.md). */
export const STAGES = [
  {
    slug: 'early-years',
    name: 'Early years',
    classes: [
      { slug: 'nursery-1', name: 'Nursery 1' },
      { slug: 'nursery-2', name: 'Nursery 2' },
    ],
  },
  {
    slug: 'primary',
    name: 'Primary',
    classes: [1, 2, 3, 4, 5, 6].map((n) => ({
      slug: `primary-${n}`,
      name: `Primary ${n}`,
    })),
  },
  {
    slug: 'junior-secondary',
    name: 'Junior secondary',
    classes: [1, 2, 3].map((n) => ({ slug: `jss-${n}`, name: `JSS ${n}` })),
  },
  {
    slug: 'senior-secondary',
    name: 'Senior secondary',
    classes: [1, 2, 3].map((n) => ({ slug: `ss-${n}`, name: `SS ${n}` })),
  },
] as const;

export const CLASSES = STAGES.flatMap((stage) =>
  stage.classes.map((c) => ({ ...c, stage: stage.slug })),
);
export const CLASS_SLUGS = CLASSES.map((c) => c.slug);

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a slug');
const text = z.string().trim().min(1);
const classSlug = z.enum(CLASS_SLUGS as [string, ...string[]]);

/** Lesson text as plain blocks, not HTML or Markdown, so nothing in content can run code. */
export const lessonBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('h'), text }),
  z.object({ type: z.literal('p'), text }),
  z.object({ type: z.literal('list'), items: z.array(text).min(1) }),
  z.object({
    type: z.literal('example'),
    title: text,
    steps: z.array(text).min(1),
  }),
  z.object({ type: z.literal('tip'), text }),
]);
export type LessonBlock = z.infer<typeof lessonBlock>;

/** An objective question, A to D, like WAEC, NECO and JAMB papers. */
export const question = z.object({
  prompt: text,
  options: z.array(text).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: text,
});

export const subject = z.object({
  slug,
  name: text,
  /** The classes that take this subject under the 2025 curriculum. */
  classes: z.array(classSlug).min(1),
});

export const topic = z.object({
  slug,
  class: classSlug,
  subject: slug,
  /** Order within the class and subject, from 1. */
  position: z.number().int().min(1),
  title: text,
  summary: text,
  minutes: z.number().int().min(1).max(60),
  lesson: z.array(lessonBlock).min(1),
  questions: z.array(question).min(3),
});

export type Subject = z.infer<typeof subject>;
export type Topic = z.infer<typeof topic>;

/** Validates the whole catalogue; throws one error listing every problem found. */
export function parseContent(raw: { subjects: unknown; topics: unknown[] }) {
  const problems: string[] = [];
  const subjects = z.array(subject).parse(raw.subjects);
  const topics = raw.topics.map((t, i) => {
    const result = topic.safeParse(t);
    if (!result.success) {
      const name = (t as { slug?: string })?.slug ?? `topic #${i + 1}`;
      problems.push(`${name}: ${z.prettifyError(result.error)}`);
    }
    return result.data;
  });

  const bySlug = new Map(subjects.map((s) => [s.slug, s]));
  if (bySlug.size !== subjects.length) problems.push('Subject slugs repeat');
  const seen = new Set<string>();
  const places = new Set<string>();
  for (const t of topics) {
    if (!t) continue;
    if (seen.has(t.slug)) problems.push(`${t.slug}: slug used twice`);
    seen.add(t.slug);
    const s = bySlug.get(t.subject);
    if (!s) problems.push(`${t.slug}: unknown subject "${t.subject}"`);
    else if (!s.classes.includes(t.class))
      problems.push(`${t.slug}: ${s.name} is not taught in ${t.class}`);
    const place = `${t.class}/${t.subject}/${t.position}`;
    if (places.has(place)) problems.push(`${t.slug}: position ${place} taken`);
    places.add(place);
  }
  if (problems.length) {
    throw new Error(`Learn content has problems:\n- ${problems.join('\n- ')}`);
  }
  return { subjects, topics: topics as Topic[] };
}
