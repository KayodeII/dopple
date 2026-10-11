import type { ComponentProps } from 'react';

/** Centred page column: 1240px max, 24px gutters. */
export function Container({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={`mx-auto w-full max-w-[1240px] px-6 ${className}`}
    />
  );
}

/** Section title row: headline on the left, supporting line on the right. */
export function SectionHeader({
  title,
  aside,
  tone = 'light',
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  tone?: 'light' | 'dark';
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <h2 className="headline max-w-[760px] text-[clamp(36px,5vw,64px)]">
        {title}
      </h2>
      {aside ? (
        <p
          className={`max-w-[380px] text-[17px] leading-normal ${tone === 'dark' ? 'text-soft' : 'text-muted'}`}
        >
          {aside}
        </p>
      ) : null}
    </div>
  );
}
