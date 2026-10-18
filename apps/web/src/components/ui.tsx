import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { useId, useState } from 'react';
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
          <p className="font-mono text-[13px] text-fg-3">{eyebrow}</p>
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
    quiet: 'border border-edge-2 text-fg hover:bg-raised',
    danger: 'border border-edge-2 text-coral hover:bg-raised',
  }[variant];
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-50 ${look} ${className}`}
      {...props}
    />
  );
}

const control =
  'min-h-11 w-full rounded-xl border border-edge-2 bg-raised px-3.5 text-[15px] text-fg placeholder:text-fg-3';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-fg-2">
      {label}
      <input className={control} {...props} />
    </label>
  );
}

/** A password input with an eye button, so people can check what they typed. */
export function PasswordField({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 text-sm text-fg-2">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          className={`${control} pr-12`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-fg-3 hover:text-fg"
        >
          <EyeIcon crossed={shown} />
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
      <circle cx="10" cy="10" r="2.5" />
      {crossed && <path d="M3 17 17 3" />}
    </svg>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-fg-2">
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
    <p className="rounded-2xl border border-dashed border-line p-6 text-fg-3">
      {children}
    </p>
  );
}

export function Loading() {
  return <p className="text-fg-3">Loading…</p>;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
