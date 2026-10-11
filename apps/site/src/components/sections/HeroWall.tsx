import Image from 'next/image';
import type { ReactNode } from 'react';
import { photos, type Photo } from '@/lib/photos';

/**
 * Cosmos-style wall of school moments behind the hero headline: real photos
 * mixed with small product tiles. Purely decorative (aria-hidden by the parent).
 */

function Tile({
  height,
  className = '',
  children,
}: {
  height: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative flex-none overflow-hidden rounded-[20px] ${className}`}
      style={{ height }}
    >
      {children}
    </div>
  );
}

function PhotoTile({ photo, height }: { photo: Photo; height: number }) {
  return (
    <Tile height={height} className="bg-graphite">
      <Image
        src={photo.src}
        alt=""
        fill
        sizes="20vw"
        className="object-cover"
      />
    </Tile>
  );
}

const mono = 'font-mono text-[11px]';

const tiles = {
  live: (
    <Tile height={230} className="flex flex-col gap-2.5 bg-graphite p-3.5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-live px-2 py-0.5 text-[11px] font-semibold text-white">
          LIVE
        </span>
        <span className={`${mono} text-soft`}>JSS2 · Maths</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {['var(--color-sun)', 'var(--color-violet)', 'var(--color-mint)'].map(
          (c) => (
            <div
              key={c}
              className="flex items-center justify-center rounded-xl bg-[#2a2b27]"
            >
              <span
                className="size-[38px] rounded-full"
                style={{ background: c }}
              />
            </div>
          ),
        )}
        <div className="flex items-center justify-center rounded-xl bg-[#2a2b27] text-[13px] text-soft">
          +31
        </div>
      </div>
    </Tile>
  ),
  bus: (
    <Tile height={210} className="bg-[#10261d]">
      <svg viewBox="0 0 200 210" className="block size-full">
        <path
          d="M0 60H200M0 140H200M60 0V210M140 0V210"
          stroke="#1b3e30"
          strokeWidth="10"
        />
        <path
          d="M20 190 C 40 140, 70 150, 100 110 S 150 60, 180 30"
          stroke="var(--color-sun)"
          strokeWidth="3"
          strokeDasharray="6 6"
          fill="none"
        />
        <circle cx="180" cy="30" r="8" fill="var(--color-mint)" />
        <circle
          cx="180"
          cy="30"
          r="8"
          fill="var(--color-mint)"
          className="ping-out"
        />
        <g>
          <rect
            x="-11"
            y="-7"
            width="22"
            height="14"
            rx="4"
            fill="var(--color-sun)"
          />
          <animateMotion
            dur="7s"
            repeatCount="indefinite"
            rotate="auto"
            path="M20 190 C 40 140, 70 150, 100 110 S 150 60, 180 30"
          />
        </g>
      </svg>
      <span className="absolute bottom-3 left-3 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink">
        Bus 2 · 5 min away
      </span>
    </Tile>
  ),
  idCard: (
    <Tile height={250} className="flex flex-col bg-paper text-ink">
      <div className="flex h-[54px] items-center bg-sun px-3.5 text-[13px] font-bold tracking-wide">
        GREENFIELD COLLEGE
      </div>
      <div className="flex flex-1 gap-3 p-3.5">
        <div className="flex h-[78px] w-16 items-end justify-center overflow-hidden rounded-[10px] bg-rule-strong">
          <span className="h-11 w-11 rounded-t-full bg-[#8e8a7f]" />
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <strong className="text-sm">Tolu Adebayo</strong>
          <span className="text-muted">JSS 2B · Student</span>
          <span className="font-mono text-muted">GF-0142</span>
        </div>
      </div>
    </Tile>
  ),
  exam: (
    <Tile
      height={220}
      className="flex flex-col justify-between bg-violet p-4 text-ink"
    >
      <span className={mono}>CBT · BASIC SCIENCE</span>
      <svg viewBox="0 0 120 120" className="size-28 self-center">
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="rgba(11,11,10,.18)"
          strokeWidth="10"
          fill="none"
        />
        <circle
          className="drain"
          pathLength={1}
          cx="60"
          cy="60"
          r="50"
          stroke="var(--color-ink)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="66"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="22"
          fill="var(--color-ink)"
        >
          42:10
        </text>
      </svg>
      <span className="text-xs font-semibold">Question 18 of 40</span>
    </Tile>
  ),
  fee: (
    <Tile
      height={190}
      className="flex flex-col justify-between bg-mint p-4 text-ink"
    >
      <span className={mono}>FEES · FIRST TERM</span>
      <div className="font-display text-[34px] font-bold tracking-tight">
        ₦185,000
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold">
        ✓ Paid · settled to school
      </div>
    </Tile>
  ),
  event: (
    <Tile
      height={270}
      className="flex flex-col justify-between bg-coral p-4 text-ink"
    >
      <span className={mono}>EVENT</span>
      <div>
        <div className="font-display text-[64px] leading-[.85] font-extrabold tracking-[-0.05em]">
          FRI
          <br />
          24
        </div>
        <div className="serif-accent mt-2 text-[26px]">Inter-house sports</div>
      </div>
      <span className="text-xs font-semibold">212 going</span>
    </Tile>
  ),
  report: (
    <Tile height={230} className="flex flex-col gap-2.5 bg-sky p-4 text-ink">
      <span className={mono}>REPORT CARD · TERM 1</span>
      {[
        ['Mathematics', 'A'],
        ['English', 'B+'],
        ['Basic Science', 'A'],
      ].map(([s, g]) => (
        <div
          key={s}
          className="flex justify-between border-b border-ink/20 pb-2 text-sm"
        >
          <span>{s}</span>
          <strong>{g}</strong>
        </div>
      ))}
      <div className="mt-auto font-display text-[28px] font-bold">
        3rd <span className="serif-accent text-xl">in class</span>
      </div>
    </Tile>
  ),
  attendance: (
    <Tile
      height={190}
      className="flex flex-col justify-between bg-pink p-4 text-ink"
    >
      <span className={mono}>ATTENDANCE · 08:41</span>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className={`aspect-square rounded-[3px] ${i === 6 || i === 13 ? 'bg-ink/20' : 'bg-ink'}`}
          />
        ))}
      </div>
      <div className="font-display text-[30px] font-bold tracking-tight">
        32/34 <span className="serif-accent text-xl">present</span>
      </div>
    </Tile>
  ),
  whiteboard: (
    <Tile height={190} className="bg-graphite">
      <svg viewBox="0 0 200 190" className="block size-full">
        <path
          d="M20 120 C 50 40, 90 40, 110 100 S 160 160, 185 60"
          stroke="var(--color-sun)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M20 160H185M20 160V30"
          stroke="var(--color-iron)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="36"
          fill="var(--color-paper)"
          fontFamily="var(--font-serif)"
          fontStyle="italic"
          fontSize="22"
        >
          y = sin x
        </text>
      </svg>
    </Tile>
  ),
};

const columns: ReactNode[][] = [
  [
    <PhotoTile key="a" photo={photos.pupilsUniform} height={300} />,
    tiles.live,
    <PhotoTile key="b" photo={photos.teacherReading} height={240} />,
    tiles.fee,
  ],
  [
    tiles.idCard,
    <PhotoTile key="c" photo={photos.studentPortrait} height={340} />,
    tiles.attendance,
    <PhotoTile key="d" photo={photos.handsRaised} height={280} />,
  ],
  [
    <PhotoTile key="e" photo={photos.classroom} height={220} />,
    tiles.exam,
    <PhotoTile key="f" photo={photos.graduate} height={260} />,
    tiles.bus,
  ],
  [
    tiles.event,
    <PhotoTile key="g" photo={photos.teacherAtBoard} height={260} />,
    tiles.report,
    <PhotoTile key="h" photo={photos.pupilsUniform} height={300} />,
  ],
  [
    <PhotoTile key="i" photo={photos.handsRaised} height={280} />,
    tiles.whiteboard,
    <PhotoTile key="j" photo={photos.studentPortrait} height={340} />,
    tiles.attendance,
  ],
];
const speeds = [52, 64, 48, 70, 58];

export function HeroWall() {
  return (
    <div className="grid h-full grid-cols-3 gap-4 md:grid-cols-5">
      {columns.map((col, i) => (
        <div
          key={i}
          className={`flex flex-col gap-4 ${i % 2 ? 'wall-down' : 'wall-up'} ${i > 2 ? 'hidden md:flex' : ''}`}
          style={{ animationDuration: `${speeds[i]}s` }}
        >
          {/* Rendered twice so the loop is seamless at translateY(-50%). */}
          {[...col, ...col].map((tile, j) => (
            <div key={j}>{tile}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
