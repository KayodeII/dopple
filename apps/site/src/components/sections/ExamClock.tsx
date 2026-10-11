'use client';

import { useEffect, useState } from 'react';

/** A ticking exam countdown for the Exams card. Purely decorative. */
export function ExamClock({ startSeconds = 2530 }: { startSeconds?: number }) {
  const [left, setLeft] = useState(startSeconds);

  useEffect(() => {
    const id = setInterval(
      () => setLeft((s) => (s > 1 ? s - 1 : startSeconds)),
      1000,
    );
    return () => clearInterval(id);
  }, [startSeconds]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <span suppressHydrationWarning>{`${mm}:${ss}`}</span>;
}
