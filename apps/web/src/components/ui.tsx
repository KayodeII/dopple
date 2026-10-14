import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { ApiError } from '../lib/api';

/** Small building blocks shared by the pages. */

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="font-mono text-[13px] text-soft">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
      </div>
      {children}
    </header>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-card p-4 ${className}`}>{children}</div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'quiet' | 'danger';
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const look = {
    primary: 'bg-school text-on-school hover:brightness-110',
    quiet: 'border border-iron text-paper hover:bg-graphite',
    danger: 'border border-iron text-coral hover:bg-graphite',
  }[variant];
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-50 ${look} ${className}`}
      {...props}
    />
  );
}

const control =
  'min-h-11 w-full rounded-xl border border-iron bg-graphite px-3.5 text-[15px] text-paper placeholder:text-soft';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-sand">
      {label}
      <input className={control} {...props} />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-sand">
      {label}
      <select className={control} {...props}>
        {children}
      </select>
    </label>
  );
}

/** Shows what the API said went wrong, e.g. "This overlaps an existing record". */
export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiError
      ? error.message
      : 'Could not reach the school. Check your connection and try again.';
  return (
    <p
      role="alert"
      className="rounded-xl border border-coral/40 px-4 py-3 text-[15px] text-coral"
    >
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line p-6 text-soft">
      {children}
    </p>
  );
}

export function Loading() {
  return <p className="text-soft">Loading…</p>;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
