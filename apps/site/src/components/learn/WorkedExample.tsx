'use client';

import { useState } from 'react';

export interface ExampleCopy {
  label: string;
  /** "Step {n} of {total}" */
  count: string;
  next: string;
  all: string;
  think: string;
}

/**
 * A worked example shown one step at a time, so the learner tries the next step in their
 * head before seeing it, the way a teacher works at the board.
 */
export function WorkedExample({
  title,
  steps,
  copy,
}: {
  title: string;
  steps: string[];
  copy: ExampleCopy;
}) {
  const [shown, setShown] = useState(1);
  const done = shown >= steps.length;

  return (
    <figure className="overflow-hidden rounded-[24px] bg-ink text-paper shadow-[0_24px_48px_-28px_rgb(11_11_10/0.6)]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-7">
        <span className="eyebrow text-sun">{copy.label}</span>
        <span className="font-mono text-[13px] text-soft">
          {copy.count
            .replace('{n}', String(shown))
            .replace('{total}', String(steps.length))}
        </span>
      </figcaption>
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        <p className="font-display text-[21px] leading-snug font-bold tracking-tight sm:text-[24px]">
          {title}
        </p>
        <ol aria-live="polite" className="flex flex-col">
          {steps.slice(0, shown).map((step, i) => (
            <li
              key={i}
              className="pop-in relative flex gap-4 pb-5 last:pb-0 before:absolute before:top-9 before:bottom-1.5 before:left-[15px] before:w-px before:bg-iron last:before:hidden"
            >
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-sun font-mono text-[13px] font-bold text-ink"
              >
                {i + 1}
              </span>
              <span className="pt-1 font-mono text-[15px] leading-relaxed sm:text-[16px]">
                {step}
              </span>
            </li>
          ))}
        </ol>
        {!done && (
          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setShown((n) => n + 1)}
                className="rounded-full bg-sun px-5 py-2.5 text-[15px] font-semibold text-ink hover:bg-paper"
              >
                {copy.next} ↓
              </button>
              <button
                type="button"
                onClick={() => setShown(steps.length)}
                className="rounded-full border border-iron px-5 py-2.5 text-[15px] text-sand hover:border-sand hover:text-paper"
              >
                {copy.all}
              </button>
            </div>
            <p className="text-[14px] text-soft">{copy.think}</p>
          </div>
        )}
      </div>
    </figure>
  );
}
