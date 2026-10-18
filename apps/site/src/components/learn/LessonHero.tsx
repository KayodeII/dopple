import { learn } from '@/lib/content';
import type { Topic } from '@/lib/learn';
import type { SubjectTheme } from '@/lib/lesson-look';

/** The lesson's cover: subject colour, a big glyph, what it is and how long it takes. */
export function LessonHero({
  topic,
  theme,
}: {
  topic: Topic;
  theme: SubjectTheme;
}) {
  const facts = [
    topic.class.name,
    topic.subject.name,
    `${topic.minutes} min`,
    learn.lesson.questions(topic.questions.length),
  ];
  return (
    <header
      className={`relative isolate overflow-hidden rounded-[32px] px-6 py-10 text-ink sm:px-12 sm:py-16 ${theme.bg}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-6 -z-10 -translate-y-1/2 font-display text-[200px] leading-none font-extrabold tracking-tighter opacity-15 select-none sm:right-10 sm:text-[320px]"
      >
        {theme.glyph}
      </span>
      <div className="flex max-w-[680px] flex-col gap-5">
        <ul className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <li
              key={fact}
              className="rounded-full bg-paper/70 px-3 py-1 text-[14px] font-semibold"
            >
              {fact}
            </li>
          ))}
        </ul>
        <h1 className="headline text-[clamp(42px,8vw,80px)] text-balance">
          {topic.title}
        </h1>
        <p className="max-w-[48ch] text-[19px] leading-snug sm:text-[22px]">
          {topic.summary}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="#lesson"
            className="rounded-full bg-ink px-6 py-3 text-[16px] font-semibold text-paper hover:bg-charcoal"
          >
            {learn.lesson.start} ↓
          </a>
          <a
            href="#practice"
            className="rounded-full bg-paper/70 px-6 py-3 text-[16px] font-semibold hover:bg-paper"
          >
            {learn.lesson.toPractice}
          </a>
        </div>
      </div>
    </header>
  );
}
