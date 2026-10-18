'use client';

import { useEffect, useState } from 'react';

/** The lesson's steps beside the text on wide screens, with the one being read marked. */
export function LessonMap({
  label,
  items,
}: {
  label: string;
  items: { id: string; title: string }[];
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    // A step counts as "being read" once it reaches the top third of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-25% 0px -65% 0px' },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className="sticky top-10 hidden lg:block">
      <p className="eyebrow mb-4 text-muted">{label}</p>
      <ol className="flex flex-col border-l border-rule-strong">
        {items.map((item, i) => {
          const current = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? 'location' : undefined}
                className={`-ml-px flex gap-3 border-l-2 py-2 pl-4 text-[15px] leading-snug ${
                  current
                    ? 'border-ink font-semibold text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <span className="pt-px font-mono text-[12px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
