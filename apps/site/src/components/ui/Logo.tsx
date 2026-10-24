/** The Dopple mark: two linked circles on a sun-yellow tile. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-[9px] bg-sun"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="5.5" cy="8" r="3.5" fill="var(--color-ink)" />
        <circle
          cx="11"
          cy="8"
          r="3.5"
          stroke="var(--color-ink)"
          strokeWidth="1.6"
        />
      </svg>
    </span>
  );
}

export function Logo({
  size = 30,
  href = '#top',
}: {
  size?: number;
  href?: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5"
      aria-label="Dopple home"
    >
      <LogoMark size={size} />
      <span className="font-display text-[21px] font-bold tracking-tight">
        dopple
      </span>
    </a>
  );
}
