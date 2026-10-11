import Image from 'next/image';
import { Container, SectionHeader } from '@/components/ui/Container';
import { schoolDay } from '@/lib/content';
import { photos } from '@/lib/photos';

export function SchoolDay() {
  return (
    <section className="bg-paper text-ink">
      <Container className="pb-30">
        <SectionHeader
          title={
            <>
              A school day, <span className="serif-accent">on Dopple.</span>
            </>
          }
          aside="Scroll through a Monday at Greenfield, from the gate to the last bus."
        />
        <div
          aria-hidden="true"
          className="relative mt-10 mb-6 h-0.5 rounded-sm bg-rule-strong"
        >
          <span className="day-progress absolute -top-[5px] -ml-1.5 size-3 rounded-full bg-ink" />
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {schoolDay.map((moment) => {
            const photo = photos[moment.photo];
            return (
              <article
                key={moment.time}
                className="zoom-on-hover flex-[0_0_300px] snap-start"
              >
                <div className="relative h-[380px] overflow-hidden rounded-3xl bg-rule-strong">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                  <span className="float-a absolute bottom-3.5 left-3.5 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: moment.dot }}
                    />
                    {moment.chip}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 px-1 pt-4">
                  <span className="font-mono text-[13px] text-muted">
                    {moment.time}
                  </span>
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    {moment.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted">
                    {moment.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
