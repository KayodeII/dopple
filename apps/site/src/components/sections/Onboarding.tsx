import type { CSSProperties } from 'react';
import { Container } from '@/components/ui/Container';
import { onboardingSteps } from '@/lib/content';

const stopX = [96, 384, 672, 960];
const vars = (name: string, value: string) =>
  ({ [name]: value }) as CSSProperties;

/** "From sign-up to the first bell": a school bus drives the route, stopping at each step. */
export function Onboarding() {
  return (
    <section className="bg-ink text-paper">
      <Container className="pt-30 pb-26">
        <span className="eyebrow text-sun">Onboarding</span>
        <h2 className="headline mt-4 max-w-[760px] text-[clamp(36px,5vw,64px)]">
          From sign-up to the first bell,{' '}
          <span className="serif-accent text-sun">one stop at a time.</span>
        </h2>
        <svg
          viewBox="0 0 1152 220"
          className="mt-14 block h-auto w-full overflow-hidden"
          role="img"
          aria-label="A school bus driving along a road, stopping at each of four onboarding stops"
        >
          <line
            x1="0"
            y1="176"
            x2="1152"
            y2="176"
            stroke="var(--color-iron)"
            strokeWidth="2"
          />
          <line
            x1="0"
            y1="190"
            x2="1152"
            y2="190"
            stroke="#2a2b27"
            strokeWidth="1"
            strokeDasharray="18 14"
          />
          {stopX.map((x, i) => (
            <g key={x}>
              <line
                x1={x}
                y1="176"
                x2={x}
                y2="120"
                stroke="var(--color-muted)"
                strokeWidth="2"
              />
              <circle
                className="bus-stop"
                style={vars('--stop-anim', `stop-${i + 1}`)}
                cx={x}
                cy="112"
                r="10"
                fill="var(--color-ink)"
                stroke="var(--color-paper)"
                strokeWidth="2"
              />
            </g>
          ))}
          <g className="bus-drive">
            <g transform="translate(0 74)">
              <g className="bus-bob">
                <path
                  className="bus-speed"
                  d="M-30 30h-26M-26 46h-40M-30 62h-22"
                  stroke="var(--color-muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <rect
                  x="0"
                  y="0"
                  width="160"
                  height="82"
                  rx="14"
                  fill="var(--color-sun)"
                />
                <rect
                  x="128"
                  y="22"
                  width="40"
                  height="60"
                  rx="10"
                  fill="var(--color-sun)"
                />
                {[12, 46, 80].map((x) => (
                  <rect
                    key={x}
                    x={x}
                    y="12"
                    width="28"
                    height="24"
                    rx="5"
                    fill="var(--color-ink)"
                  />
                ))}
                <rect
                  x="114"
                  y="12"
                  width="20"
                  height="24"
                  rx="5"
                  fill="var(--color-ink)"
                />
                <line
                  x1="0"
                  y1="52"
                  x2="168"
                  y2="52"
                  stroke="var(--color-ink)"
                  strokeWidth="2"
                />
                <rect
                  x="160"
                  y="60"
                  width="10"
                  height="8"
                  rx="2"
                  fill="var(--color-paper)"
                />
              </g>
              {[36, 138].map((cx) => (
                <g key={cx} className="bus-wheel">
                  <circle
                    cx={cx}
                    cy="86"
                    r="14"
                    fill="var(--color-ink)"
                    stroke="var(--color-paper)"
                    strokeWidth="3"
                  />
                  <path
                    d={`M${cx} 76v20M${cx - 10} 86h20`}
                    stroke="var(--color-muted)"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </g>
          </g>
        </svg>
        <ol className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
          {onboardingSteps.map((step, i) => (
            <li
              key={step.title}
              className="bus-step flex flex-col gap-2"
              style={vars('--step-anim', `step-${i + 1}`)}
            >
              <span
                className={`font-mono text-[13px] ${i === 3 ? 'text-sun' : 'text-soft'}`}
              >
                Stop 0{i + 1}
              </span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="leading-relaxed text-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
