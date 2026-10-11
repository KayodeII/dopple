import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { HandNote, Marked } from '@/components/ui/Text';
import { promises } from '@/lib/content';
import { photos } from '@/lib/photos';

/** Six promises written on an exercise-book page, ticked in red pen. */
export function Promises() {
  return (
    <section className="bg-paper text-ink">
      <Container className="flex flex-wrap items-start gap-12 py-30">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <HandNote
            color="var(--color-live)"
            rotate={-4}
            className="self-start"
          >
            Homework, done.
          </HandNote>
          <h2 className="headline text-[clamp(36px,5vw,64px)] leading-[0.95]">
            Six promises, <Marked>in writing.</Marked>
          </h2>
          <p className="max-w-[380px] text-[17px] leading-relaxed text-muted">
            What every school gets from day one, whatever the plan.
          </p>
          <div className="relative mt-3 h-[260px] -rotate-2 overflow-hidden rounded-3xl border-8 border-white shadow-[0_20px_50px_rgba(11,11,10,.18)]">
            <Image
              src={photos.studentRuler.src}
              alt={photos.studentRuler.alt}
              fill
              sizes="400px"
              className="object-cover"
            />
          </div>
        </div>
        <div className="ruled relative min-w-0 flex-[2_1_560px] rotate-[0.6deg] rounded-[6px_24px_24px_6px] bg-[#fffefa] py-12 pr-5 pl-16 md:pr-8 md:pl-22 shadow-[0_30px_80px_rgba(11,11,10,.14),inset_14px_0_0_#e8e3d6]">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-[44px] md:left-[66px] w-0.5 bg-[#f2a0a0]"
          />
          <HandNote
            color="var(--color-live)"
            rotate={6}
            className="absolute top-3.5 right-7 text-[26px]"
          >
            10/10
          </HandNote>
          <ol className="flex flex-col">
            {promises.map((promise, i) => (
              <li
                key={promise.title}
                className="flex min-h-24 items-start gap-4.5"
              >
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 34 34"
                  aria-hidden="true"
                  className="mt-1.5 flex-none"
                >
                  <circle
                    cx="17"
                    cy="17"
                    r="15"
                    fill="none"
                    stroke="var(--color-sand)"
                    strokeWidth="2"
                  />
                  <path
                    className="tick"
                    style={
                      { ['--delay' as string]: `${i * 0.5}s` } as CSSProperties
                    }
                    pathLength={1}
                    d="M9 18 L15 24 L26 10"
                    fill="none"
                    stroke="var(--color-live)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <div className="font-display text-xl leading-[48px] font-bold tracking-tight md:text-2xl">
                    {promise.title}
                  </div>
                  <div className="text-[15px] leading-[48px] text-iron md:text-[17px]">
                    {promise.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
