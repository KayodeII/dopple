/** The Dopple mark from apps/site (two linked circles on a sun-yellow tile), for "on Dopple" credits. */
export function DoppleMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[7px] bg-sun"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 16 16"
        fill="none"
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

/** "Powered by dopple", in Dopple's own type. */
export function PoweredByDopple() {
  return (
    <p className="flex items-center gap-2 text-[13px] text-fg-3">
      Powered by
      <span className="flex items-center gap-1.5 text-fg">
        <DoppleMark size={20} />
        <span className="font-display text-[16px] font-bold tracking-tight">
          dopple
        </span>
      </span>
    </p>
  );
}
