import type { ComponentProps } from 'react';

type Variant = 'sun' | 'ink' | 'paper' | 'outline-dark' | 'outline-light';

const variants: Record<Variant, string> = {
  sun: 'bg-sun text-ink hover:brightness-95',
  ink: 'bg-ink text-paper hover:bg-graphite',
  paper: 'bg-paper text-ink hover:bg-white',
  'outline-dark': 'border border-iron text-paper hover:border-soft',
  'outline-light':
    'border border-rule-strong bg-white text-ink hover:border-muted',
};

/** Pill-shaped link styled as a button. Labels should say what the visitor gets. */
export function LinkButton({
  variant = 'sun',
  className = '',
  ...props
}: ComponentProps<'a'> & { variant?: Variant }) {
  return (
    <a
      {...props}
      className={`inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-4 text-base font-semibold transition ${variants[variant]} ${className}`}
    />
  );
}
