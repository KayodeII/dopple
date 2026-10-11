import type { CSSProperties, ReactNode } from 'react';

/** A phrase with a highlighter-pen background, in the serif italic. */
export function Marked({
  children,
  color = 'var(--color-sun)',
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span className="serif-accent mark" style={{ background: color }}>
      {children}
    </span>
  );
}

/** A handwritten note, slightly rotated. */
export function HandNote({
  children,
  color = 'var(--color-muted)',
  rotate = -3,
  className = '',
  style,
}: {
  children: ReactNode;
  color?: string;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-block font-hand text-[30px] font-bold ${className}`}
      style={{ color, transform: `rotate(${rotate}deg)`, ...style }}
    >
      {children}
    </span>
  );
}

/** Small star used as a separator in tapes and on crests. */
export function Star({
  size = 26,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <path
        d="M13 0 L16 10 L26 13 L16 16 L13 26 L10 16 L0 13 L10 10 Z"
        fill={color}
      />
    </svg>
  );
}
