import { Container } from '@/components/ui/Container';
import { HandNote, Marked } from '@/components/ui/Text';
import { beforeAfter } from '@/lib/content';

/** The buyer's status quo, crossed out in red pen, answered by one calm card. */
export function BeforeAfter() {
  return (
    <section className="bg-paper text-ink">
      <Container className="pt-20 pb-30">
        <HandNote color="var(--color-live)">{beforeAfter.note}</HandNote>
        <h2 className="headline mt-2 max-w-[900px] text-[clamp(36px,5.4vw,72px)]">
          {beforeAfter.headline}{' '}
          <Marked color="var(--color-pink)">{beforeAfter.highlight}</Marked>
        </h2>
        <div className="mt-14 flex flex-wrap items-center gap-12">
          <ul className="flex min-w-0 flex-[1_1_420px] flex-col gap-4.5">
            {beforeAfter.before.map((item, i) => (
              <li
                key={item}
                className="font-display text-[clamp(22px,2.4vw,32px)] font-semibold tracking-tight text-muted"
              >
                <span
                  className="strike"
                  style={{ ['--delay' as string]: `${i * 0.35}s` }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <div className="relative min-w-0 flex-[1_1_400px] overflow-hidden rounded-[32px] bg-ink p-9 text-paper shadow-[0_30px_80px_rgba(11,11,10,.25)]">
            <div
              aria-hidden="true"
              className="absolute -top-15 -right-15 size-[220px] rounded-full bg-sun opacity-90"
            />
            <span className="eyebrow relative text-xs text-sun">
              With Dopple
            </span>
            <h3 className="headline relative mt-3.5 text-[40px] leading-none">
              One login. <span className="serif-accent">One place.</span>
            </h3>
            <ul className="relative mt-6 flex flex-col gap-3.5 text-base text-sand">
              {beforeAfter.after.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="font-bold text-mint" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
