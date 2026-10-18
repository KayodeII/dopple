import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LearnShell } from '@/components/learn/LearnShell';
import { LessonBlocks } from '@/components/learn/LessonBlocks';
import { Practice } from '@/components/learn/Practice';
import { learn } from '@/lib/content';
import { getTopic, lessonPath } from '@/lib/learn';

type Props = PageProps<'/learn/[class]/[lesson]'>;

async function load(params: Props['params']) {
  const { class: classSlug, lesson } = await params;
  const topic = await getTopic(`${classSlug}-${lesson}`).catch(() => undefined);
  // The class in the URL must be the lesson's own class.
  return topic && topic.class.slug !== classSlug ? null : topic;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = await load(params);
  return topic
    ? {
        title: `${topic.title} · ${topic.class.name} ${topic.subject.name} · Dopple Learn`,
        description: topic.summary,
      }
    : { title: 'Dopple Learn' };
}

export default function LessonPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <LearnShell>
          <p className="text-muted">Loading the lesson…</p>
        </LearnShell>
      }
    >
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: Pick<Props, 'params'>) {
  const topic = await load(params);
  if (topic === null) notFound();
  if (!topic) {
    return (
      <LearnShell>
        <p className="text-danger">{learn.unavailable}</p>
      </LearnShell>
    );
  }

  return (
    <LearnShell
      crumbs={[
        { label: topic.class.name, href: `/learn/${topic.class.slug}` },
        { label: topic.subject.name },
      ]}
    >
      <article className="flex max-w-[720px] flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="eyebrow text-muted">
            {topic.class.name} · {topic.subject.name} · {topic.minutes} min
          </p>
          <h1 className="headline text-[clamp(36px,6vw,56px)] text-balance">
            {topic.title}
          </h1>
          <p className="text-[18px] text-muted">{topic.summary}</p>
        </header>
        <LessonBlocks blocks={topic.lesson} />
        <Practice
          topic={topic.slug}
          questions={topic.questions}
          copy={learn.practice}
        />
        <nav
          aria-label="More lessons"
          className="flex flex-wrap justify-between gap-3 border-t border-rule-strong pt-6 text-[16px]"
        >
          {topic.previous ? (
            <Link
              href={lessonPath(topic.class.slug, topic.previous.slug)}
              className="font-semibold underline underline-offset-4"
            >
              ← {topic.previous.title}
            </Link>
          ) : (
            <Link
              href={`/learn/${topic.class.slug}`}
              className="font-semibold underline underline-offset-4"
            >
              ← All {topic.class.name} lessons
            </Link>
          )}
          {topic.next && (
            <Link
              href={lessonPath(topic.class.slug, topic.next.slug)}
              className="font-semibold underline underline-offset-4"
            >
              {topic.next.title} →
            </Link>
          )}
        </nav>
      </article>
    </LearnShell>
  );
}
