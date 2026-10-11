import { LinkButton } from '@/components/ui/Button';
import { HandNote } from '@/components/ui/Text';
import { hero } from '@/lib/content';
import { HeroWall } from './HeroWall';

const planePath = 'M-60 700 C 300 520, 500 760, 760 600 S 1200 260, 1520 300';

export function Hero() {
  return (
    <section
      id="top"
      className="relative h-[880px] overflow-hidden bg-paper text-ink"
    >
      <div
        aria-hidden="true"
        className="wall-mask absolute inset-x-4 -top-10 bottom-0 opacity-35 md:opacity-80"
      >
        <HeroWall />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 64% 56% at 50% 48%, rgba(245,243,238,1) 0%, rgba(245,243,238,.94) 55%, rgba(245,243,238,0) 100%)',
        }}
      />
      {/* Paper plane drifting across */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 880"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-10 size-full"
      >
        <path
          d={planePath}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
          strokeDasharray="4 10"
          opacity=".18"
        />
        <g>
          <path
            d="M0 0 L34 12 L0 24 L8 12 Z"
            fill="#fff"
            stroke="var(--color-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M8 12 L34 12" stroke="var(--color-ink)" strokeWidth="1.5" />
          <animateMotion
            dur="14s"
            repeatCount="indefinite"
            rotate="auto"
            path={planePath}
          />
        </g>
      </svg>

      <div className="relative z-20 mx-auto flex h-full max-w-[1000px] flex-col items-center justify-center px-6 text-center">
        <div className="fade-up relative">
          <Doodles />
          <HandNote className="mb-2.5 text-[clamp(22px,2.4vw,32px)]">
            {hero.note}
          </HandNote>
          <h1 className="font-display text-[clamp(50px,8.4vw,124px)] leading-[0.92] font-extrabold tracking-[-0.055em]">
            {hero.lead}
            <br />
            <span className="word-rot" aria-label={hero.rotatingWords[0].text}>
              {hero.rotatingWords.map((w) => (
                <span
                  key={w.text}
                  aria-hidden="true"
                  className="serif-accent mark tracking-[-0.02em]"
                  style={{ background: w.color }}
                >
                  {w.text}
                </span>
              ))}
            </span>
          </h1>
        </div>
        <p className="fade-up-2 mt-7 max-w-[620px] text-[clamp(17px,1.6vw,21px)] leading-normal text-iron">
          {hero.body}
        </p>
        <div className="fade-up-3 mt-9 flex flex-wrap justify-center gap-3">
          <LinkButton href="#demo">{hero.primaryCta}</LinkButton>
          <LinkButton href="#product" variant="outline-light">
            <span className="flex size-[22px] items-center justify-center rounded-full bg-ink">
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
              >
                <path d="M2.5 1.5v7l6-3.5z" fill="var(--color-paper)" />
              </svg>
            </span>
            {hero.secondaryCta}
          </LinkButton>
        </div>
        <p className="fade-up-3 mt-4.5 text-sm text-muted">
          {hero.reassurance}
        </p>
      </div>
    </section>
  );
}

/** Chalk doodles that draw themselves around the headline. */
function Doodles() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 80 80"
        className="absolute -top-11 -left-16 hidden w-[72px] md:block"
      >
        <path
          className="draw"
          pathLength={1}
          d="M40 6 L48 30 L74 30 L53 45 L61 70 L40 55 L19 70 L27 45 L6 30 L32 30 Z"
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 120 60"
        className="absolute -top-7 -right-24 hidden w-[120px] md:block"
      >
        <text
          x="10"
          y="44"
          fontFamily="var(--font-hand)"
          fontWeight="700"
          fontSize="46"
          fill="var(--color-mint)"
          transform="rotate(-10 60 30)"
        >
          A+
        </text>
        <path
          className="draw draw-late"
          pathLength={1}
          d="M8 52 C 30 40, 70 58, 110 44"
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}
