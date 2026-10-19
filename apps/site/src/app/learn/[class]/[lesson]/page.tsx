import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LearnShell } from '@/components/learn/LearnShell';
import { LessonBody } from '@/components/learn/LessonBody';
import { LessonHero } from '@/components/learn/LessonHero';
import { LessonMap } from '@/components/learn/LessonMap';
import { Practice } from '@/components/learn/Practice';
import { learn } from '@/lib/content';
import { getTopic, lessonPath } from '@/lib/learn';
import { subjectTheme, toSections } from '@/lib/lesson-look';

type Props = PageProps<'/learn/[class]/[lesson]'>;

async function load(params: Props['params']) {
  const { class: classSlug, lesson } = await params;
  const topic = await getTopic(`${classSlug}-${lesson}`);
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

  const theme = subjectTheme(topic.subject.slug);
  const sections = toSections(topic.lesson);
  const steps = sections.flatMap((s) =>
    s.id && s.title ? [{ id: s.id, title: s.title }] : [],
  );
  const { lesson } = learn;

  return (
    <LearnShell
      crumbs={[
        { label: topic.class.name, href: `/learn/${topic.class.slug}` },
        { label: topic.subject.name },
      ]}
    >
      <div
        aria-hidden="true"
        className="reading-progress fixed inset-x-0 top-0 z-40 h-1 bg-ink"
      />
      <LessonHero topic={topic} theme={theme} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
        <article id="lesson" className="flex min-w-0 scroll-mt-8 flex-col gap-16">
          <LessonBody sections={sections} theme={theme} copy={lesson.body} />

          <div className={`-mx-4 rounded-[32px] px-4 py-8 sm:mx-0 sm:px-8 sm:py-10 ${theme.soft}`}>
            <p className="mb-3 font-hand text-[34px] leading-none font-bold">
              {lesson.yourTurn}
            </p>
            <Practice
              topic={topic.slug}
              questions={topic.questions}
              copy={learn.practice}
            />
          </div>

          <nav aria-label="More lessons" className="grid gap-3 sm:grid-cols-2">
            <Link
              href={
                topic.previous
                  ? lessonPath(topic.class.slug, topic.previous.slug)
                  : `/learn/${topic.class.slug}`
              }
              className="flex flex-col gap-1 rounded-3xl border border-rule-strong bg-white p-6 hover:border-ink"
            >
              <span className="eyebrow text-muted">
                ← {topic.previous ? lesson.previousLesson : lesson.backTo}
              </span>
              <span className="font-display text-[20px] font-bold tracking-tight">
                {topic.previous?.title ?? lesson.allLessons(topic.class.name)}
              </span>
            </Link>
            {topic.next && (
              <Link
                href={lessonPath(topic.class.slug, topic.next.slug)}
                className={`group flex flex-col gap-1 rounded-3xl p-6 text-ink sm:text-right ${theme.bg}`}
              >
                <span className="eyebrow">{lesson.nextLesson} →</span>
                <span className="font-display text-[24px] leading-tight font-bold tracking-tight group-hover:underline">
                  {topic.next.title}
                </span>
              </Link>
            )}
          </nav>
        </article>

        <aside>
          <LessonMap
            label={lesson.map}
            items={[...steps, { id: 'practice', title: learn.practice.title }]}
          />
        </aside>
      </div>
    </LearnShell>
  );
}
