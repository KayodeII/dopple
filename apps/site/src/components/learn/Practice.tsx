'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { Question } from '@/lib/learn';

const LETTERS = ['A', 'B', 'C', 'D'];

export interface PracticeCopy {
  title: string;
  intro: string;
  progress: string;
  keys: string;
  correct: string;
  wrong: string;
  previous: string;
  next: string;
  finish: string;
  skip: string;
  goTo: string;
  unanswered: string;
  resultsTitle: string;
  outOf: string;
  great: string;
  good: string;
  keepGoing: string;
  review: string;
  tryAgain: string;
  best: string;
}

/** Fills {name} placeholders in copy from content.ts. */
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

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

/**
 * Practice in the style of a computer-based exam: one question at a time, a navigator
 * to jump between questions, instant feedback, then a score. Not an exam: answers are on
 * the page and nothing is sent anywhere. The best score stays in this browser (ADR 0011).
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
  const total = questions.length;
  const [picked, setPicked] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const [current, setCurrent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const key = `dopple:learn:best:${topic}`;
  // Read after hydration (the server has no storage), and kept in step with other tabs.
  const stored = useSyncExternalStore(
    subscribeToStorage,
    () => readBest(key),
    () => null,
  );
  const [scored, setScored] = useState<number | null>(null);
  const best = Math.max(stored ?? 0, scored ?? 0) || null;

  const right = picked.filter((p, i) => p === questions[i]!.answer).length;
  const allAnswered = picked.every((p) => p !== null);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // After moving between questions, focus the new one (for screen readers and the keys)
  // and keep the card in view on small screens. Not on the first render.
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
    card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current, showResults]);

  function go(index: number) {
    moved.current = true;
    setShowResults(false);
    setCurrent(Math.max(0, Math.min(total - 1, index)));
  }

  function pick(option: number) {
    if (picked[current] !== null) return;
    const next = picked.map((p, i) => (i === current ? option : p));
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

  function restart() {
    setPicked(questions.map(() => null));
    go(0);
  }

  /** Forward: the next question, then any skipped one, then the score once all are done. */
  function forward() {
    if (current < total - 1) return go(current + 1);
    const skipped = picked.findIndex((p) => p === null);
    if (skipped !== -1) return go(skipped);
    moved.current = true;
    setShowResults(true);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || showResults) return;
    const letter = LETTERS.indexOf(event.key.toUpperCase());
    if (letter !== -1) {
      event.preventDefault();
      pick(letter);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      forward();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(current - 1);
    }
  }

  const question = questions[current]!;
  const choice = picked[current] ?? null;
  const answered = choice !== null;
  const finishing = current === total - 1 && allAnswered;

  return (
    <section aria-labelledby="practice" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id="practice"
          className="font-display text-[28px] font-bold tracking-tight"
        >
          {copy.title}
        </h2>
        {best !== null && (
          <p className="rounded-full bg-ok/10 px-3 py-1 text-[14px] font-semibold text-ok">
            {fill(copy.best, { right: best, total })}
          </p>
        )}
      </div>
      <p className="text-[16px] text-muted">{copy.intro}</p>

      <div
        ref={card}
        onKeyDown={onKeyDown}
        className="scroll-mt-4 overflow-hidden rounded-[28px] border border-rule-strong bg-white shadow-[0_24px_48px_-32px_rgb(11_11_10/0.35)]"
      >
        <Navigator
          questions={questions}
          picked={picked}
          current={showResults ? -1 : current}
          onGo={go}
          label={(n) => fill(copy.goTo, { n })}
          unanswered={copy.unanswered}
        />

        {showResults ? (
          <Results
            right={right}
            questions={questions}
            picked={picked}
            copy={copy}
            heading={heading}
            onGo={go}
            onRestart={restart}
          />
        ) : (
          <div key={current} className="pop-in flex flex-col gap-6 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[13px] tracking-wide text-muted uppercase">
                {fill(copy.progress, { n: current + 1, total })}
              </p>
              <p className="hidden font-mono text-[12px] text-muted sm:block">
                {copy.keys}
              </p>
            </div>

            <fieldset>
              <legend className="mb-5 w-full">
                <h3
                  ref={heading}
                  tabIndex={-1}
                  className="font-display text-[clamp(22px,3vw,28px)] leading-snug font-semibold tracking-tight text-balance outline-none"
                >
                  {question.prompt}
                </h3>
              </legend>
              <div className="grid gap-3">
                {question.options.map((option, oi) => (
                  <OptionTile
                    key={oi}
                    name={`${topic}-q${current}`}
                    letter={LETTERS[oi]!}
                    text={option}
                    state={
                      !answered
                        ? 'open'
                        : oi === question.answer
                          ? 'right'
                          : oi === choice
                            ? 'wrong'
                            : 'faded'
                    }
                    checked={oi === choice}
                    onPick={() => pick(oi)}
                  />
                ))}
              </div>
            </fieldset>

            <div aria-live="polite">
              {answered && (
                <Feedback
                  correct={choice === question.answer}
                  title={
                    choice === question.answer
                      ? copy.correct
                      : fill(copy.wrong, { letter: LETTERS[question.answer]! })
                  }
                  explanation={question.explanation}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-rule pt-5">
              <button
                type="button"
                onClick={() => go(current - 1)}
                disabled={current === 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-ink hover:bg-paper disabled:invisible"
              >
                <Arrow back />
                {copy.previous}
              </button>
              <button
                type="button"
                onClick={forward}
                className={`inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors ${
                  finishing
                    ? 'bg-sun text-ink hover:brightness-95'
                    : answered
                      ? 'bg-ink text-paper hover:bg-graphite'
                      : 'border border-rule-strong text-ink hover:border-ink'
                }`}
              >
                {finishing ? copy.finish : answered ? copy.next : copy.skip}
                <Arrow />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** One segment per question, coloured by result; tap to jump. Doubles as the progress bar. */
function Navigator({
  questions,
  picked,
  current,
  onGo,
  label,
  unanswered,
}: {
  questions: Question[];
  picked: (number | null)[];
  current: number;
  onGo: (index: number) => void;
  label: (n: number) => string;
  unanswered: string;
}) {
  return (
    <nav
      aria-label="Questions"
      className="flex gap-1.5 border-b border-rule bg-paper/60 px-5 pt-3 pb-2 sm:px-8"
    >
      {questions.map((q, i) => {
        const p = picked[i] ?? null;
        const state = p === null ? unanswered : p === q.answer ? '✓' : '✗';
        const bar =
          p === null
            ? i === current
              ? 'bg-ink'
              : 'bg-rule-strong'
            : p === q.answer
              ? 'bg-ok'
              : 'bg-danger';
        return (
          <button
            key={i}
            type="button"
            onClick={() => onGo(i)}
            aria-label={`${label(i + 1)} (${state})`}
            aria-current={i === current ? 'step' : undefined}
            className="group flex min-h-8 flex-1 items-center"
          >
            <span
              className={`w-full rounded-full transition-all group-hover:opacity-80 ${bar} ${
                i === current ? 'h-2.5 ring-2 ring-ink/15 ring-offset-2' : 'h-2'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}

function OptionTile({
  name,
  letter,
  text,
  state,
  checked,
  onPick,
}: {
  name: string;
  letter: string;
  text: string;
  state: 'open' | 'right' | 'wrong' | 'faded';
  checked: boolean;
  onPick: () => void;
}) {
  const tile = {
    open: 'cursor-pointer border-rule-strong bg-white hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_8px_20px_-12px_rgb(11_11_10/0.35)]',
    right: 'border-ok bg-ok/[0.07]',
    wrong: 'border-danger bg-danger/[0.07]',
    faded: 'border-rule bg-white opacity-55',
  }[state];
  const badge = {
    open: 'bg-paper text-ink group-hover:bg-ink group-hover:text-paper',
    right: 'bg-ok text-white',
    wrong: 'bg-danger text-white',
    faded: 'bg-paper text-muted',
  }[state];
  return (
    <label
      className={`group flex min-h-16 items-center gap-4 rounded-2xl border-2 px-4 py-3 text-[17px] transition-all has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${tile}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={state !== 'open'}
        onChange={onPick}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-[15px] font-semibold transition-colors ${badge}`}
      >
        {letter}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
      {state === 'right' && <Mark ok />}
      {state === 'wrong' && <Mark />}
    </label>
  );
}

function Feedback({
  correct,
  title,
  explanation,
}: {
  correct: boolean;
  title: string;
  explanation: string;
}) {
  return (
    <div
      className={`pop-in flex gap-3 rounded-2xl p-4 sm:p-5 ${
        correct ? 'bg-ok/10' : 'bg-danger/10'
      }`}
    >
      <Mark ok={correct} filled />
      <div className="flex flex-col gap-1">
        <p
          className={`text-[16px] font-bold ${correct ? 'text-ok' : 'text-danger'}`}
        >
          {title}
        </p>
        <p className="text-[16px] leading-relaxed text-ink">{explanation}</p>
      </div>
    </div>
  );
}

function Results({
  right,
  questions,
  picked,
  copy,
  heading,
  onGo,
  onRestart,
}: {
  right: number;
  questions: Question[];
  picked: (number | null)[];
  copy: PracticeCopy;
  heading: RefObject<HTMLHeadingElement | null>;
  onGo: (index: number) => void;
  onRestart: () => void;
}) {
  const total = questions.length;
  const share = right / total;
  const ring =
    share === 1 ? 'stroke-ok' : share >= 0.6 ? 'stroke-sun' : 'stroke-danger';
  const message =
    share === 1 ? copy.great : share >= 0.6 ? copy.good : copy.keepGoing;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="pop-in flex flex-col items-center gap-6 p-6 text-center sm:p-10">
      <h3 ref={heading} tabIndex={-1} className="eyebrow text-muted outline-none">
        {copy.resultsTitle}
      </h3>
      <div className="relative size-36">
        <svg
          viewBox="0 0 120 120"
          className="size-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="10"
            className="stroke-rule"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
            className={ring}
          />
        </svg>
        <p
          role="status"
          aria-label={`${right} ${fill(copy.outOf, { total })}`}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="font-display text-[44px] leading-none font-bold tracking-tight">
            {right}
          </span>
          <span className="mt-1 text-[14px] text-muted">
            {fill(copy.outOf, { total })}
          </span>
        </p>
      </div>
      <p className="max-w-[36ch] text-[18px] font-semibold text-balance">
        {message}
      </p>

      <div className="flex flex-col items-center gap-3">
        <p className="text-[14px] text-muted">{copy.review}</p>
        <ol className="flex flex-wrap justify-center gap-2">
          {questions.map((q, i) => {
            const ok = picked[i] === q.answer;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onGo(i)}
                  aria-label={`${fill(copy.goTo, { n: i + 1 })} (${ok ? '✓' : '✗'})`}
                  className={`flex size-11 items-center justify-center rounded-xl font-mono text-[15px] font-semibold transition-transform hover:-translate-y-0.5 ${
                    ok ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="inline-flex min-h-12 items-center rounded-full bg-ink px-7 text-[15px] font-semibold text-paper hover:bg-graphite"
      >
        {copy.tryAgain}
      </button>
    </div>
  );
}

function Mark({
  ok = false,
  filled = false,
}: {
  ok?: boolean;
  filled?: boolean;
}) {
  const look = filled
    ? ok
      ? 'bg-ok text-white'
      : 'bg-danger text-white'
    : ok
      ? 'text-ok'
      : 'text-danger';
  return (
    <span
      aria-hidden="true"
      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${look}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ok ? (
          <path d="M3.5 8.5l3 3 6-7" />
        ) : (
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
        )}
      </svg>
    </span>
  );
}

function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={back ? 'rotate-180' : ''}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
