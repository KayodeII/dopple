'use client';

import { useState, useSyncExternalStore } from 'react';
import type { Question } from '@/lib/learn';

const LETTERS = ['A', 'B', 'C', 'D'];

export interface PracticeCopy {
  title: string;
  intro: string;
  tryAgain: string;
  correct: string;
  wrong: string;
  score: string;
  best: string;
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readBest(key: string): number | null {
  try {
    const saved = Number(localStorage.getItem(key));
    return saved > 0 ? saved : null;
  } catch {
    return null;
  }
}

/** Fills {name} placeholders in copy from content.ts. */
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

/**
 * Practice questions with instant feedback. Not an exam: answers are on the page and nothing
 * is sent anywhere. The best score is kept in this browser only (ADR 0011: no personal data).
 */
export function Practice({
  topic,
  questions,
  copy,
}: {
  topic: string;
  questions: Question[];
  copy: PracticeCopy;
}) {
  const [picked, setPicked] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const [round, setRound] = useState(0);
  const key = `dopple:learn:best:${topic}`;
  // Read after hydration (the server has no storage), and kept in step with other tabs.
  const stored = useSyncExternalStore(
    subscribeToStorage,
    () => readBest(key),
    () => null,
  );
  const [scored, setScored] = useState<number | null>(null);
  const best = Math.max(stored ?? 0, scored ?? 0) || null;

  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === questions[i]!.answer).length;
  const done = answered === questions.length;

  function pick(question: number, option: number) {
    if (picked[question] !== null) return;
    const next = picked.map((p, i) => (i === question ? option : p));
    setPicked(next);
    if (next.every((p) => p !== null)) {
      const score = next.filter((p, i) => p === questions[i]!.answer).length;
      if (score > (best ?? 0)) {
        setScored(score);
        try {
          localStorage.setItem(key, String(score));
        } catch {
          // Storage blocked: the best score just isn't kept.
        }
      }
    }
  }

  return (
    <section aria-labelledby="practice" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="practice"
          className="font-display text-[28px] font-bold tracking-tight"
        >
          {copy.title}
        </h2>
        {best !== null && (
          <p className="text-[15px] text-muted">
            {fill(copy.best, { right: best, total: questions.length })}
          </p>
        )}
      </div>
      <p className="text-[16px] text-muted">{copy.intro}</p>
      <ol className="flex flex-col gap-5">
        {questions.map((q, qi) => {
          const choice = picked[qi];
          return (
            <li
              key={`${round}-${qi}`}
              className="rounded-2xl border border-rule-strong bg-white p-5"
            >
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-[17px] font-semibold">
                  {qi + 1}. {q.prompt}
                </legend>
                {q.options.map((option, oi) => {
                  const isAnswer = oi === q.answer;
                  const isChoice = oi === choice;
                  const look =
                    choice === null
                      ? 'border-rule-strong hover:border-ink'
                      : isAnswer
                        ? 'border-ok bg-ok/10'
                        : isChoice
                          ? 'border-danger bg-danger/10'
                          : 'border-rule opacity-60';
                  return (
                    <label
                      key={oi}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-[16px] has-disabled:cursor-default ${look}`}
                    >
                      <input
                        type="radio"
                        name={`q${round}-${qi}`}
                        checked={isChoice}
                        disabled={choice !== null}
                        onChange={() => pick(qi, oi)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current font-mono text-[13px]"
                      >
                        {LETTERS[oi]}
                      </span>
                      <span>{option}</span>
                    </label>
                  );
                })}
                <div aria-live="polite">
                  {choice !== null && (
                    <p
                      className={`mt-2 rounded-xl px-4 py-3 text-[16px] ${
                        choice === q.answer
                          ? 'bg-ok/10 text-ok'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      <strong>
                        {choice === q.answer
                          ? copy.correct
                          : fill(copy.wrong, { letter: LETTERS[q.answer]! })}{' '}
                      </strong>
                      <span className="text-ink">{q.explanation}</span>
                    </p>
                  )}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-ink px-5 py-4 text-paper">
          <p role="status" className="text-[18px] font-semibold">
            {fill(copy.score, { right, total: questions.length })}
          </p>
          <button
            type="button"
            onClick={() => {
              setPicked(questions.map(() => null));
              setRound((r) => r + 1);
            }}
            className="min-h-11 rounded-full bg-sun px-5 text-[15px] font-semibold text-ink"
          >
            {copy.tryAgain}
          </button>
        </div>
      )}
    </section>
  );
}
