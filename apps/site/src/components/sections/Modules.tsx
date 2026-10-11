import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { ExamClock } from './ExamClock';

/** Bento grid of the operational modules: ID cards, exams, bus tracking, fees, events. */
export function Modules() {
  return (
    <section id="modules" className="rounded-t-[40px] bg-paper text-ink">
      <Container className="py-30">
        <span className="eyebrow text-muted">The whole school day</span>
        <h2 className="headline mt-4 max-w-[820px] text-[clamp(36px,5vw,64px)]">
          From the gate at 7:40 to the{' '}
          <span className="serif-accent">last bus home.</span>
        </h2>
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <IdCardModule />
          <ExamModule />
          <BusModule />
          <FeesModule />
          <EventsModule />
        </div>
      </Container>
    </section>
  );
}

function Card({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`flex min-h-[440px] flex-col gap-3.5 overflow-hidden rounded-[28px] p-8 ${className}`}
    >
      {children}
    </article>
  );
}

function CardTitle({
  label,
  title,
  accent,
  labelClass = '',
}: {
  label: string;
  title: string;
  accent: string;
  labelClass?: string;
}) {
  return (
    <>
      <span className={`eyebrow text-xs ${labelClass}`}>{label}</span>
      <h3 className="font-display text-[32px] leading-none font-bold tracking-[-0.03em]">
        {title} <span className="serif-accent">{accent}</span>
      </h3>
    </>
  );
}

function IdCardModule() {
  return (
    <Card className="relative flex-row flex-wrap items-center !gap-6 bg-ink text-paper md:col-span-2">
      <div className="relative z-10 flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
        <span className="eyebrow text-xs text-sun">ID cards</span>
        <h3 className="font-display text-4xl leading-none font-bold tracking-[-0.03em]">
          One card. <span className="serif-accent">Gate, bus and library.</span>
        </h3>
        <p className="max-w-[360px] leading-relaxed text-soft">
          Print cards for the whole school in one go. Each QR code holds a
          signed token, not personal details, and can be cancelled the moment a
          card is lost.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2 text-[13px]">
          <span className="float-a flex items-center gap-2 rounded-full border border-line bg-graphite px-3.5 py-2">
            <span className="size-2 rounded-full bg-mint" /> Checked in at the
            gate · 07:42
          </span>
          <span className="float-b flex items-center gap-2 rounded-full border border-line bg-graphite px-3.5 py-2">
            <span className="size-2 rounded-full bg-sun" /> Boarded Bus 2 ·
            15:10
          </span>
        </div>
      </div>
      <div className="relative flex flex-[1_1_300px] justify-center py-5 [perspective:1400px]">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-[360px] -translate-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(245,180,0,.35), rgba(245,180,0,0) 65%)',
          }}
        />
        <div
          role="img"
          aria-label="A student ID card with photo and QR code"
          className="id-card flex h-[440px] w-[300px] flex-col overflow-hidden rounded-3xl bg-paper text-ink shadow-[0_30px_80px_rgba(0,0,0,.55)]"
        >
          <div className="flex items-center justify-between bg-sun px-5.5 py-5">
            <span className="font-display text-[15px] leading-tight font-extrabold tracking-wide">
              GREENFIELD
              <br />
              COLLEGE
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-ink font-serif text-[22px] text-sun italic">
              G
            </span>
          </div>
          <div className="flex items-end gap-4 p-5.5">
            <div className="flex h-[116px] w-24 items-end justify-center overflow-hidden rounded-[14px] bg-gradient-to-b from-rule-strong to-[#b9b4a6]">
              <span className="h-[70px] w-[66px] rounded-t-full bg-[#6f6b61]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-muted">STUDENT</span>
              <strong className="font-display text-[22px] leading-none">
                Tolu
                <br />
                Adebayo
              </strong>
              <span className="text-[13px] text-muted">JSS 2B</span>
            </div>
          </div>
          <div className="mx-5.5 mt-auto mb-5.5 flex items-center gap-3.5">
            <svg
              width="92"
              height="92"
              viewBox="0 0 23 23"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              <rect width="23" height="23" fill="var(--color-paper)" />
              <path
                fill="var(--color-ink)"
                d="M1 1h7v7H1zM15 1h7v7h-7zM1 15h7v7H1z"
              />
              <path
                fill="var(--color-paper)"
                d="M2 2h5v5H2zM16 2h5v5h-5zM2 16h5v5H2z"
              />
              <path
                fill="var(--color-ink)"
                d="M3 3h3v3H3zM17 3h3v3h-3zM3 17h3v3H3zM10 1h2v2h-2zM9 4h3v2H9zM12 7h2v2h-2zM9 9h2v3H9zM13 10h3v2h-3zM17 9h2v2h-2zM20 10h2v3h-2zM10 13h2v2h-2zM14 14h2v3h-2zM17 13h3v2h-3zM10 17h3v2h-3zM15 18h2v4h-2zM18 17h2v2h-2zM19 20h3v2h-3zM11 20h2v2h-2zM1 10h3v2H1zM5 11h2v2H5z"
              />
            </svg>
            <div className="flex flex-col gap-0.5 text-[11px] text-muted">
              <span className="font-mono">GF-0142</span>
              <span>Valid to Jul 2027</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ExamModule() {
  return (
    <Card className="bg-violet text-ink">
      <CardTitle
        label="Exams"
        title="Online exams that"
        accent="start on time."
      />
      <div className="mt-auto flex items-center gap-4.5 rounded-[20px] bg-ink p-5 text-paper">
        <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="var(--color-line)"
            strokeWidth="10"
            fill="none"
          />
          <circle
            className="drain"
            pathLength={1}
            cx="60"
            cy="60"
            r="50"
            stroke="var(--color-violet)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="flex flex-col gap-1">
          <span className="font-display text-[34px] font-bold tracking-tight tabular-nums">
            <ExamClock />
          </span>
          <span className="text-[13px] text-soft">
            Basic Science · Q18 of 40
          </span>
          <span className="text-xs text-mint">Answers saved</span>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed">
        Papers unlock at the start time, answers save as students go, and
        objective questions mark themselves.
      </p>
    </Card>
  );
}

const busRoute =
  'M30 220 C 60 170, 90 170, 90 120 S 160 70, 230 70 S 330 110, 360 40';

function BusModule() {
  return (
    <Card className="bg-[#10261d] text-paper">
      <CardTitle
        label="Bus tracking"
        labelClass="text-mint"
        title="Know where"
        accent="the bus is."
      />
      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-[18px] bg-[#0d1f17]">
        <svg
          viewBox="0 0 400 240"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full"
          role="img"
          aria-label="Map with a school bus moving along its route to the school"
        >
          <path
            d="M0 70H400M0 170H400M90 0V240M230 0V240M330 0V240"
            stroke="#173a2b"
            strokeWidth="16"
          />
          <path d="M0 120H400M160 0V240" stroke="#14301f" strokeWidth="8" />
          <path
            d={busRoute}
            stroke="var(--color-sun)"
            strokeWidth="3"
            strokeDasharray="7 7"
            fill="none"
          />
          <circle cx="360" cy="40" r="9" fill="var(--color-mint)" />
          <circle
            className="ping-out"
            cx="360"
            cy="40"
            r="9"
            fill="var(--color-mint)"
          />
          <circle cx="30" cy="220" r="5" fill="var(--color-paper)" />
          <g>
            <rect
              x="-14"
              y="-9"
              width="28"
              height="18"
              rx="5"
              fill="var(--color-sun)"
              stroke="#0d1f17"
              strokeWidth="2"
            />
            <animateMotion
              dur="9s"
              repeatCount="indefinite"
              rotate="auto"
              path={busRoute}
            />
          </g>
        </svg>
        <div className="notify absolute inset-x-3 top-3 flex items-center gap-2.5 rounded-[14px] bg-paper px-3 py-2.5 text-[13px] text-ink">
          <span
            className="flex size-7 items-center justify-center rounded-lg bg-sun"
            aria-hidden="true"
          >
            🚌
          </span>
          <span>
            <strong>Bus 2</strong> is 5 minutes from Tolu&apos;s stop
          </span>
        </div>
      </div>
    </Card>
  );
}

const payments = [
  ['AO', 'Mrs. Obi', 'Amaka · First term', '₦185,000', 'var(--color-sun)'],
  ['MB', 'Mr. Bello', 'Musa · Bus fee', '₦45,000', 'var(--color-violet)'],
  [
    'TA',
    'Mrs. Adebayo',
    'Tolu · Part payment',
    '₦90,000',
    'var(--color-coral)',
  ],
] as const;

function FeesModule() {
  return (
    <Card className="bg-mint text-ink">
      <CardTitle
        label="School fees"
        title="Paid online,"
        accent="straight to the school."
      />
      <div
        className="mt-auto h-[216px] overflow-hidden rounded-[18px] bg-ink px-4"
        aria-label="Recent fee payments"
      >
        <div className="fee-stack">
          {[...payments, ...payments].map(
            ([initials, payer, detail, amount, color], i) => (
              <div
                key={i}
                aria-hidden={i >= payments.length || undefined}
                className="flex h-[72px] items-center gap-3 border-b border-line text-paper"
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full text-[13px] font-bold text-ink"
                  style={{ background: color }}
                >
                  {initials}
                </span>
                <span className="flex-1 text-sm">
                  {payer}
                  <br />
                  <span className="text-xs text-soft">{detail}</span>
                </span>
                <strong className="text-[15px]">{amount}</strong>
              </div>
            ),
          )}
        </div>
      </div>
      <p className="text-[15px] leading-relaxed">
        Parents pay by card or transfer, money settles to the school&apos;s own
        bank account, and you know who has paid without opening a single bank
        statement.
      </p>
      <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/15 bg-ink/5 px-3.5 py-2.5 text-sm">
        <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold tracking-wide text-mint uppercase">
          Coming soon
        </span>
        <span>
          <strong>Pay small small:</strong> let parents spread a term&apos;s
          fees into smaller payments.
        </span>
      </p>
    </Card>
  );
}

function EventsModule() {
  return (
    <Card className="bg-coral text-ink">
      <CardTitle label="Events" title="Every date," accent="every RSVP." />
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="float-a flex items-center gap-3.5 rounded-[18px] bg-ink p-4 text-paper">
          <span className="text-center font-display text-[34px] leading-[.9] font-extrabold">
            24
            <br />
            <span className="text-[13px] font-semibold text-coral">OCT</span>
          </span>
          <span className="flex-1">
            Inter-house sports
            <br />
            <span className="text-[13px] text-soft">
              Whole school · 212 going
            </span>
          </span>
        </div>
        <div className="float-b flex items-center gap-3.5 rounded-[18px] bg-paper p-4">
          <span className="text-center font-display text-[34px] leading-[.9] font-extrabold">
            02
            <br />
            <span className="text-[13px] font-semibold text-[#b4432f]">
              NOV
            </span>
          </span>
          <span className="flex-1">
            PTA meeting
            <br />
            <span className="text-[13px] text-muted">Parents · 86 going</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
