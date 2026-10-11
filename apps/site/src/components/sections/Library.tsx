import { Container, SectionHeader } from '@/components/ui/Container';
import { library } from '@/lib/content';

/** Netflix-style "Top 10" shelf of recorded lessons. */
export function Library() {
  const shelf = [...library, ...library];
  return (
    <section
      id="library"
      className="overflow-hidden bg-ink pt-10 pb-30 text-paper"
    >
      <Container>
        <SectionHeader
          tone="dark"
          title={
            <>
              Top 10 in Greenfield{' '}
              <span className="serif-accent text-sun">this week.</span>
            </>
          }
          aside="Every live class becomes a lesson in the school's library, ready to stream or save for offline."
        />
      </Container>
      <div className="marquee-pause mt-12">
        <div
          className="marquee gap-5"
          style={{ ['--marquee-duration' as string]: '60s' }}
        >
          {shelf.map((lesson, i) => (
            <a
              key={i}
              href="#library"
              aria-hidden={i >= library.length || undefined}
              tabIndex={i >= library.length ? -1 : undefined}
              className="flex flex-none items-end transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.03]"
            >
              <span
                aria-hidden="true"
                className="font-display text-[200px] leading-[.8] font-extrabold tracking-[-0.06em] text-ink [-webkit-text-stroke:3px_var(--color-iron)]"
              >
                {(i % library.length) + 1}
              </span>
              <span
                className="relative -ml-[34px] flex h-[290px] w-[210px] flex-col justify-between overflow-hidden rounded-[18px] p-4.5 shadow-[0_20px_50px_rgba(0,0,0,.5)]"
                style={{ background: lesson.bg, color: lesson.ink }}
              >
                <span className="font-mono text-[11px] opacity-80">
                  {lesson.subject}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute top-15 -right-7 font-serif text-[170px] leading-none italic opacity-90"
                >
                  {lesson.glyph}
                </span>
                <span className="relative flex flex-col gap-1.5">
                  <span className="font-display text-[22px] leading-[1.05] font-bold">
                    {lesson.title}
                  </span>
                  <span className="text-xs opacity-80">{lesson.meta}</span>
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
