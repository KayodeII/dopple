import { cacheLife } from 'next/cache';
import { API_URL } from '@/lib/schools';

/** Shapes returned by the API's public GET /learn endpoints (ADR 0011). */
export interface ClassRef {
  slug: string;
  name: string;
}

export interface Catalogue {
  stages: {
    slug: string;
    name: string;
    classes: (ClassRef & { topicCount: number })[];
  }[];
}

export interface TopicSummary {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  questionCount: number;
}

export interface ClassLevel {
  class: ClassRef & { stage: string };
  subjects: { slug: string; name: string; topics: TopicSummary[] }[];
}

export type LessonBlock =
  | { type: 'h' | 'p' | 'tip'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'example'; title: string; steps: string[] };

export interface Question {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Topic {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  lesson: LessonBlock[];
  updatedAt: string;
  class: ClassRef;
  subject: ClassRef;
  questions: Question[];
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

/**
 * Lessons change only when content is loaded, so pages are cached. Minutes, not days: if the
 * API was unreachable (say, during a build), the page recovers on its own soon after.
 * `null` means the API had no such page; `undefined` means it couldn't be reached. Errors are
 * caught in here because one thrown from a cached function fails the prerender, even when
 * the caller catches it.
 */
async function get<T>(path: string): Promise<T | null | undefined> {
  'use cache';
  cacheLife('minutes');
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

export const getCatalogue = () => get<Catalogue>('/learn');
export const getClassLevel = (slug: string) =>
  get<ClassLevel>(`/learn/classes/${encodeURIComponent(slug)}`);
export const getTopic = (slug: string) =>
  get<Topic>(`/learn/topics/${encodeURIComponent(slug)}`);

/** Lesson URLs drop the class from the topic slug: jss-1-hcf-and-lcm → /learn/jss-1/hcf-and-lcm. */
export const lessonPath = (classSlug: string, topicSlug: string) =>
  `/learn/${classSlug}/${topicSlug.slice(classSlug.length + 1)}`;
