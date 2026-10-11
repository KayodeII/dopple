import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { faqs } from '@/lib/content';
import { photos } from '@/lib/photos';

export function Faq() {
  return (
    <section className="rounded-t-[40px] bg-paper text-ink">
      <Container className="flex flex-wrap gap-14 pt-30 pb-10">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 className="headline text-[clamp(36px,5vw,64px)]">
            Questions schools <span className="serif-accent">ask us.</span>
          </h2>
          <div className="relative mt-8 h-80 overflow-hidden rounded-[28px]">
            <Image
              src={photos.boysTies.src}
              alt={photos.boysTies.alt}
              fill
              sizes="400px"
              className="ken-burns object-cover"
            />
          </div>
        </div>
        <div className="min-w-0 flex-[2_1_520px] border-b border-rule-strong">
          {faqs.map((faq) => (
            <details key={faq.q} className="border-t border-rule-strong py-6">
              <summary className="flex items-center justify-between gap-6 font-display text-[22px] font-semibold tracking-tight">
                {faq.q}
                <span
                  aria-hidden="true"
                  className="faq-plus flex size-9 flex-none items-center justify-center rounded-full bg-ink text-[22px] font-normal text-paper"
                >
                  +
                </span>
              </summary>
              <p className="mt-3.5 max-w-[760px] text-base leading-relaxed text-muted">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
