import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnShell } from '@/components/learn/LearnShell';
import { learn } from '@/lib/content';
import { getCatalogue } from '@/lib/learn';

export const metadata: Metadata = {
  title: 'Learn for free · Dopple',
  description: learn.body,
};

export default function LearnPage() {
  return (
    <LearnShell>
      <div className="flex max-w-[720px] flex-col gap-4">
        <p className="eyebrow text-muted">{learn.eyebrow}</p>
        <h1 className="headline text-[clamp(40px,7vw,72px)] text-balance">
          {learn.title}
        </h1>
        <p className="text-[18px] leading-normal text-muted">{learn.body}</p>
        <p className="text-[15px] text-muted">{learn.dataNote}</p>
      </div>

      <section aria-labelledby="classes" className="flex flex-col gap-6">
        <h2
          id="classes"
          className="font-display text-[28px] font-bold tracking-tight"
        >
          {learn.pickClass}
        </h2>
        <Suspense fallback={<p className="text-muted">Loading classes…</p>}>
          <Classes />
        </Suspense>
        <p className="max-w-[720px] text-[15px] text-muted">{learn.growing}</p>
      </section>

      <section aria-labelledby="exams" className="flex flex-col gap-6">
        <div className="flex max-w-[720px] flex-col gap-2">
          <h2
            id="exams"
            className="font-display text-[28px] font-bold tracking-tight"
          >
            {learn.exams.title}
          </h2>
          <p className="text-[16px] text-muted">{learn.exams.body}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {learn.exams.list.map((exam) => (
            <li
              key={exam.name}
              className="flex flex-col gap-2 rounded-2xl border border-rule-strong bg-white p-5"
            >
              <p className="eyebrow text-muted">
                {exam.by} · {exam.when}
              </p>
              <h3 className="text-[19px] font-bold">{exam.name}</h3>
              <p className="text-[15px] leading-normal">{exam.what}</p>
            </li>
          ))}
        </ul>
        <p className="max-w-[720px] rounded-2xl bg-sun/25 px-5 py-4 text-[16px]">
          {learn.exams.credits}
        </p>
      </section>
    </LearnShell>
  );
}

async function Classes() {
  const catalogue = await getCatalogue().catch(() => null);
  if (!catalogue) return <p className="text-danger">{learn.unavailable}</p>;
  return (
    <div className="flex flex-col gap-8">
      {catalogue.stages.map((stage) => (
        <div key={stage.slug} className="flex flex-col gap-3">
          <h3 className="eyebrow text-muted">{stage.name}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stage.classes.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/learn/${c.slug}`}
                  className="flex min-h-20 flex-col justify-between gap-2 rounded-2xl border border-rule-strong bg-white p-4 hover:border-ink"
                >
                  <span className="font-display text-[20px] font-bold tracking-tight">
                    {c.name}
                  </span>
                  <span
                    className={`text-[13px] ${c.topicCount ? 'font-semibold text-ok' : 'text-muted'}`}
                  >
                    {c.topicCount ? learn.lessons(c.topicCount) : learn.noLessons}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
