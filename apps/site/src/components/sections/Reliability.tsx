import { Container } from '@/components/ui/Container';
import { reliability } from '@/lib/content';

export function Reliability() {
  return (
    <section className="border-t border-graphite bg-ink text-paper">
      <Container className="flex flex-wrap items-center gap-14 py-30">
        <div className="min-w-0 flex-[1_1_380px]">
          <span className="eyebrow text-sun">Reliability</span>
          <h2 className="headline mt-4 text-[clamp(36px,5vw,64px)]">
            Built for{' '}
            <span className="serif-accent text-sun">8 a.m. on a Monday.</span>
          </h2>
          <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-soft">
            Dopple reads every school&apos;s timetable and adds capacity minutes
            before the bell, so the whole school can start at once.
          </p>
        </div>
        <div className="grid min-w-0 flex-[1_1_520px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {reliability.map((item) => (
            <div
              key={item.title}
              className="rounded-[20px] border border-line bg-charcoal p-6.5"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2.5 leading-normal text-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
