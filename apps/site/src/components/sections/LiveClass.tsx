import type { CSSProperties } from 'react';
import { Container, SectionHeader } from '@/components/ui/Container';
import { Marked } from '@/components/ui/Text';

/** Each whiteboard element names the keyframes it plays (see globals.css, "Live class preview"). */
const anim = (name: string) =>
  ({ ['--wb-anim' as string]: name }) as CSSProperties;

export function LiveClass() {
  return (
    <section id="product" className="bg-paper text-ink">
      <Container className="relative pt-10 pb-30">
        <div
          aria-hidden="true"
          className="absolute inset-x-[10%] top-20 h-[420px] blur-[20px]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(245,180,0,.35), rgba(245,180,0,0) 70%)',
          }}
        />
        <div className="relative mb-8">
          <SectionHeader
            title={
              <>
                A classroom that <Marked>never drops</Marked> the lesson.
              </>
            }
            aside="HD video that falls back to audio and slides on weak networks, a whiteboard everyone draws on, and attendance taken as students join."
          />
        </div>
        <div className="relative rounded-3xl border border-line bg-[#111210] p-3.5 text-paper shadow-[0_40px_100px_rgba(11,11,10,.28)]">
          <BrowserBar />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Whiteboard />
            <VideoColumn />
          </div>
        </div>
      </Container>
    </section>
  );
}

function BrowserBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1.5 pb-3.5">
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 rounded-full bg-iron" />
        ))}
      </div>
      <div className="relative overflow-hidden rounded-lg bg-graphite px-3.5 py-1.5 font-mono text-[13px] text-soft">
        greenfield.dopple.school/live/jss2-maths
        <span className="url-load absolute bottom-0 left-0 h-0.5 w-full bg-sun" />
      </div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="pulse-live size-2 rounded-full bg-live" />
        Live · 34 in class
      </div>
    </div>
  );
}

function Whiteboard() {
  return (
    <div className="flex min-h-[380px] min-w-0 flex-col gap-3 rounded-2xl bg-graphite p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[15px] font-semibold">
          Whiteboard · Simultaneous equations
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-7 rounded-lg bg-[#2a2b27]" />
          <span className="size-7 rounded-lg bg-sun" />
          <span className="size-7 rounded-lg bg-[#2a2b27]" />
        </div>
      </div>
      <svg
        viewBox="0 0 640 260"
        className="h-auto w-full flex-1"
        role="img"
        aria-label="Equations being written on the class whiteboard, then solved on a graph"
      >
        <text
          className="wb-write"
          style={anim('wb-eq1')}
          x="24"
          y="60"
          fill="var(--color-paper)"
          fontFamily="var(--font-display)"
          fontSize="34"
        >
          2x + 3y = 12
        </text>
        <text
          className="wb-write"
          style={anim('wb-eq2')}
          x="24"
          y="116"
          fill="var(--color-paper)"
          fontFamily="var(--font-display)"
          fontSize="34"
        >
          x − y = 1
        </text>
        <path
          className="wb-line"
          style={anim('wb-under')}
          pathLength={1}
          d="M20 140 C 120 132, 220 146, 320 138"
          stroke="var(--color-sun)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <text
          className="wb-write"
          style={anim('wb-ans')}
          x="24"
          y="196"
          fill="var(--color-soft)"
          fontFamily="var(--font-display)"
          fontSize="30"
        >
          x = 3, y = 2
        </text>
        <circle
          className="wb-line"
          style={anim('wb-circle')}
          pathLength={1}
          cx="190"
          cy="186"
          r="44"
          stroke="var(--color-sun)"
          strokeWidth="2.5"
          fill="none"
        />
        <line
          x1="400"
          y1="40"
          x2="400"
          y2="230"
          stroke="var(--color-iron)"
          strokeWidth="1.5"
        />
        <line
          x1="380"
          y1="210"
          x2="620"
          y2="210"
          stroke="var(--color-iron)"
          strokeWidth="1.5"
        />
        <path
          className="wb-line"
          style={anim('wb-l1')}
          pathLength={1}
          d="M400 210 L 560 60"
          stroke="var(--color-paper)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          className="wb-line"
          style={anim('wb-l2')}
          pathLength={1}
          d="M420 230 L 600 110"
          stroke="#9fd3c7"
          strokeWidth="2.5"
          fill="none"
        />
        <circle
          className="wb-point"
          cx="514"
          cy="155"
          r="6"
          fill="var(--color-sun)"
        />
        <g className="wb-pen" aria-hidden="true">
          <path
            d="M0 0 L 0 14 L 4 10 L 9 10 Z"
            fill="#9fd3c7"
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
          <rect x="10" y="12" width="52" height="18" rx="9" fill="#9fd3c7" />
          <text
            x="36"
            y="25"
            textAnchor="middle"
            fill="var(--color-ink)"
            fontFamily="var(--font-sans)"
            fontSize="11"
            fontWeight="600"
          >
            Amaka
          </text>
        </g>
      </svg>
    </div>
  );
}

function VideoColumn() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative flex min-h-[180px] flex-1 items-end overflow-hidden rounded-2xl bg-[#2a2b27] p-3.5">
        <div
          aria-hidden="true"
          className="speak-ring absolute top-[42%] left-1/2 -mt-[42px] -ml-[42px] size-[84px] rounded-full bg-[#4a4b45]"
        />
        <div className="hand-toast absolute inset-x-3 top-3 flex items-center gap-2 rounded-[10px] bg-paper px-2.5 py-2 text-[13px] font-semibold text-ink">
          ✋ Tolu raised a hand
        </div>
        <div className="relative flex w-full items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span
              aria-hidden="true"
              className="inline-flex h-3.5 items-end gap-0.5"
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="eq-bar h-3.5 w-[3px] rounded-sm bg-sun"
                />
              ))}
            </span>
            Mr. Okafor · Teacher
          </span>
          <span className="rounded-md bg-sun px-2 py-0.5 font-mono text-xs text-ink">
            HD
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['Tolu', 'Amaka', '+31'].map((name) => (
          <div
            key={name}
            className="flex aspect-square items-end rounded-xl bg-[#2a2b27] p-2 text-xs text-soft"
          >
            {name}
          </div>
        ))}
      </div>
      <div className="flex gap-2" aria-hidden="true">
        <span className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#2a2b27] text-sm">
          Mic
        </span>
        <span className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#2a2b27] text-sm">
          Camera
        </span>
        <span className="flex h-11 flex-1 items-center justify-center rounded-xl bg-live text-sm font-semibold text-white">
          Leave
        </span>
      </div>
    </div>
  );
}
