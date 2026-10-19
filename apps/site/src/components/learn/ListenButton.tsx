'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const noop = () => () => {};

/** Maths symbols read badly aloud ("3 slash 4"), so spell them out first. */
function forSpeech(text: string) {
  return text
    .replace(/(\d+)\/(\d+)/g, '$1 over $2')
    .replace(/₦\s?([\d,.]+)/g, '$1 naira')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/[−–](?=\s?\d)/g, ' minus ')
    .replace(/=/g, ' equals ')
    .replace(/→/g, ' becomes ')
    .replace(/%/g, ' per cent')
    .replace(/\^(\d+)/g, ' to the power $1')
    .replace(/[✓✗]/g, '');
}

/** Chrome stops long utterances after about 15 seconds, so speak in sentence-sized pieces. */
function toChunks(text: string) {
  const chunks: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const last = chunks.at(-1);
    if (last && last.length + sentence.length < 180) chunks[chunks.length - 1] = `${last} ${sentence}`;
    else chunks.push(sentence);
  }
  return chunks.filter((c) => c.trim());
}

/**
 * A Nigerian English voice if the device has one, else British, else any English. Voices on
 * the device come first: some browsers' online voices would spend the learner's data.
 */
function pickVoice(voices: SpeechSynthesisVoice[]) {
  const ranked = [...voices].sort(
    (a, b) => Number(b.localService) - Number(a.localService),
  );
  return (
    ranked.find((v) => v.lang === 'en-NG') ??
    ranked.find((v) => v.lang === 'en-GB') ??
    ranked.find((v) => v.lang.startsWith('en'))
  );
}

type State = 'idle' | 'speaking' | 'failed';

/**
 * Reads a part of the lesson aloud with the browser's own voice: no download, no data
 * used. Helps young children, and parents who find English text hard. Hidden where the
 * browser has no speech.
 */
export function ListenButton({
  text,
  label,
  stopLabel,
  failedLabel,
}: {
  text: string;
  label: string;
  stopLabel: string;
  failedLabel: string;
}) {
  const supported = useSyncExternalStore(
    noop,
    () => 'speechSynthesis' in window,
    () => false,
  );
  const [state, setState] = useState<State>('idle');
  // Which reading is ours, so another button starting (or leaving the page) is told apart
  // from a real failure. The utterances are kept so Chrome doesn't drop them mid-speech.
  const run = useRef(0);
  const queued = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(
    () => () => {
      if (run.current) window.speechSynthesis.cancel();
    },
    [],
  );

  if (!supported) return null;

  function finish(id: number, next: State) {
    if (run.current !== id) return;
    run.current = 0;
    queued.current = [];
    setState(next);
  }

  function start() {
    const synth = window.speechSynthesis;
    const busy = synth.speaking || synth.pending;
    if (busy) synth.cancel();
    const id = Date.now();
    const voice = pickVoice(synth.getVoices());
    const chunks = toChunks(forSpeech(text));
    const speakAll = () => {
      synth.resume();
      queued.current = chunks.map((chunk, i) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? 'en-GB';
        utterance.rate = 0.92;
        if (i === chunks.length - 1) utterance.onend = () => finish(id, 'idle');
        utterance.onerror = (event) =>
          finish(
            id,
            event.error === 'interrupted' || event.error === 'canceled'
              ? 'idle'
              : 'failed',
          );
        synth.speak(utterance);
        return utterance;
      });
    };
    run.current = id;
    setState('speaking');
    // Chrome can drop a speak() made straight after cancel(), so give it a moment.
    if (busy) setTimeout(speakAll, 80);
    else speakAll();
  }

  function stop() {
    run.current = 0;
    queued.current = [];
    window.speechSynthesis.cancel();
    setState('idle');
  }

  const speaking = state === 'speaking';
  return (
    <button
      type="button"
      onClick={speaking ? stop : start}
      aria-pressed={speaking}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] font-semibold ${
        speaking
          ? 'border-ink bg-ink text-paper'
          : state === 'failed'
            ? 'border-danger bg-white text-danger'
            : 'border-rule-strong bg-white text-ink hover:border-ink'
      }`}
    >
      <SpeakerIcon speaking={speaking} />
      {speaking ? stopLabel : state === 'failed' ? failedLabel : label}
    </button>
  );
}

function SpeakerIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
      {speaking ? (
        <path d="M11 6l3 4M14 6l-3 4" />
      ) : (
        <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.5 6.5 0 0 1 0 9" />
      )}
    </svg>
  );
}
