import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LearnShell } from '@/components/learn/LearnShell';
import { learn } from '@/lib/content';
import { getClassLevel, lessonPath } from '@/lib/learn';

export async function generateMetadata({
  params,
}: PageProps<'/learn/[class]'>): Promise<Metadata> {
  const level = await getClassLevel((await params).class);
  return {
    title: level ? `${level.class.name} lessons · Dopple Learn` : 'Dopple Learn',
    description: learn.body,
  };
}

export default function ClassPage({ params }: PageProps<'/learn/[class]'>) {
  return (
    <Suspense
      fallback={
        <LearnShell>
          <p className="text-muted">Loading…</p>
        </LearnShell>
      }
    >
      <ClassLessons params={params} />
    </Suspense>
  );
}

async function ClassLessons({
  params,
}: Pick<PageProps<'/learn/[class]'>, 'params'>) {
  const slug = (await params).class;
  const level = await getClassLevel(slug);
  if (level === null) notFound();
  if (!level) {
    return (
      <LearnShell>
        <p className="text-danger">{learn.unavailable}</p>
      </LearnShell>
    );
  }

  const withLessons = level.subjects.filter((s) => s.topics.length);
  const comingSoon = level.subjects.filter((s) => !s.topics.length);
  return (
    <LearnShell crumbs={[{ label: level.class.name }]}>
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-muted">{learn.eyebrow}</p>
        <h1 className="headline text-[clamp(40px,7vw,64px)]">
          {level.class.name}
        </h1>
      </div>

      {withLessons.length === 0 && (
        <p className="max-w-[720px] text-[17px] text-muted">{learn.growing}</p>
      )}

      {withLessons.map((subject) => (
        <section
          key={subject.slug}
          aria-labelledby={subject.slug}
          className="flex flex-col gap-4"
        >
          <h2
            id={subject.slug}
            className="font-display text-[26px] font-bold tracking-tight"
          >
            {subject.name}
          </h2>
          <ol className="flex flex-col gap-3">
            {subject.topics.map((topic) => (
              <li key={topic.slug}>
                <Link
                  href={lessonPath(level.class.slug, topic.slug)}
                  className="flex flex-col gap-1 rounded-2xl border border-rule-strong bg-white p-5 hover:border-ink"
                >
                  <span className="text-[19px] font-bold">{topic.title}</span>
                  <span className="text-[16px] text-muted">
                    {topic.summary}
                  </span>
                  <span className="mt-1 font-mono text-[13px] text-muted">
                    {topic.minutes} min · {topic.questionCount} questions
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {comingSoon.length > 0 && (
        <section aria-labelledby="coming-soon" className="flex flex-col gap-3">
          <h2 id="coming-soon" className="eyebrow text-muted">
            {learn.alsoTaught(level.class.name)}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {comingSoon.map((s) => (
              <li
                key={s.slug}
                className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[14px] text-muted"
              >
                {s.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </LearnShell>
  );
}
