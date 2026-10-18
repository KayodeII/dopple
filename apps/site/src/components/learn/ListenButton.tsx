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

/**
 * Reads a part of the lesson aloud with the browser's own voice: no download, no data
 * used. Helps young children, and parents who find English text hard. Hidden where the
 * browser has no speech.
 */
export function ListenButton({
  text,
  label,
  stopLabel,
}: {
  text: string;
  label: string;
  stopLabel: string;
}) {
  const supported = useSyncExternalStore(
    noop,
    () => 'speechSynthesis' in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  // The utterance this button started, so leaving the page only stops our own voice.
  const mine = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(
    () => () => {
      if (mine.current) window.speechSynthesis.cancel();
    },
    [],
  );

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) {
      mine.current = null;
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(forSpeech(text));
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === 'en-NG') ??
      voices.find((v) => v.lang === 'en-GB');
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'en-NG';
    utterance.rate = 0.92;
    utterance.onend = utterance.onerror = () => {
      if (mine.current === utterance) mine.current = null;
      setSpeaking(false);
    };
    mine.current = utterance;
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] font-semibold ${
        speaking
          ? 'border-ink bg-ink text-paper'
          : 'border-rule-strong bg-white text-ink hover:border-ink'
      }`}
    >
      <SpeakerIcon speaking={speaking} />
      {speaking ? stopLabel : label}
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
