'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { findSchool } from '@/lib/content';
import type { FoundSchool } from '@/lib/schools';

interface Result {
  q: string;
  schools: FoundSchool[];
  failed: boolean;
}

/**
 * A combobox: type part of a school's name, pick it from the list (mouse or
 * arrow keys and Enter), and go to that school's own sign-in page.
 */
export function SchoolSearch() {
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const text = q.trim();

  useEffect(() => {
    if (text.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schools?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setResult({
          q: text,
          schools: (await res.json()) as FoundSchool[],
          failed: false,
        });
      } catch {
        if (!controller.signal.aborted)
          setResult({ q: text, schools: [], failed: true });
      }
      setActive(-1);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  // Only the answer for what is typed now counts; older answers are ignored.
  const current = text.length >= 2 && result?.q === text ? result : null;
  const schools = current?.schools ?? [];
  const loading = text.length >= 2 && !current;

  const go = (school: FoundSchool) => window.location.assign(school.signInUrl);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && schools.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % schools.length);
    } else if (event.key === 'ArrowUp' && schools.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? schools.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      const pick =
        schools[active] ?? (schools.length === 1 ? schools[0] : undefined);
      if (pick) {
        event.preventDefault();
        go(pick);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && schools.length > 0;
  const message =
    text.length < 2
      ? findSchool.hint
      : current?.failed
        ? findSchool.unavailable
        : current && schools.length === 0
          ? findSchool.noMatch
          : '';

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="text-[15px] font-semibold">
        {findSchool.label}
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${id}-option-${active}` : undefined
        }
        autoComplete="off"
        autoFocus
        placeholder={findSchool.placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="min-h-14 w-full rounded-2xl border border-rule-strong bg-white px-5 text-[17px] text-ink placeholder:text-soft focus:border-ink focus:outline-none"
      />
      <p aria-live="polite" className="min-h-6 text-[15px] text-muted">
        {loading ? 'Searching…' : message}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label="Schools"
        hidden={!showList}
        className="absolute top-[92px] z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-rule bg-white shadow-[0_18px_40px_-20px_rgba(11,11,10,0.35)]"
      >
        {schools.map((school, i) => (
          <li
            key={school.slug}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown, not click: picks before the input's blur can close the list.
            onMouseDown={(e) => {
              e.preventDefault();
              go(school);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${i === active ? 'bg-paper' : ''}`}
          >
            <Crest school={school} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{school.name}</span>
              <span className="truncate text-sm text-muted">
                {[school.city, school.url.replace(/^https?:\/\//, '')]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Crest({ school }: { school: FoundSchool }) {
  if (school.logoUrl) {
    // School logos come from each school's own address; a plain img avoids image-domain config.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={school.logoUrl}
        alt=""
        className="size-10 shrink-0 rounded-xl border border-rule object-contain"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
      style={{ background: school.brandColor ?? 'var(--color-school)' }}
    >
      {school.name[0]}
    </span>
  );
}
