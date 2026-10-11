import { cacheLife } from 'next/cache';
import Image from 'next/image';
import { LinkButton } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Logo } from '@/components/ui/Logo';
import { HandNote } from '@/components/ui/Text';
import { contact, footerLinks } from '@/lib/content';
import { photoCredits, photos } from '@/lib/photos';

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <Container className="pt-8">
        <ClosingCard />
        <LinkColumns />
        <div
          aria-hidden="true"
          className="wordmark-photo pt-2 pb-18 text-center font-display text-[clamp(96px,23vw,340px)] leading-[.95] font-extrabold tracking-[-0.075em] whitespace-nowrap"
          style={{ backgroundImage: `url(${photos.handsRaised.src.src})` }}
        >
          dopple
        </div>
        <BottomStrip />
      </Container>
    </footer>
  );
}

function ClosingCard() {
  const collage = [
    {
      photo: photos.studentPortrait,
      className: 'left-[6%] top-[34px] h-[250px] -rotate-6',
      position: 'center 20%',
    },
    {
      photo: photos.graduate,
      className: 'left-[27%] top-2.5 z-10 h-[280px]',
      position: 'center',
    },
    {
      photo: photos.pupilsUniform,
      className: 'right-[6%] top-11 h-[240px] rotate-[7deg]',
      position: 'center',
    },
  ];
  return (
    <div className="relative flex flex-wrap items-center gap-10 overflow-hidden rounded-[36px] border border-line bg-charcoal p-[clamp(28px,4vw,56px)]">
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-30 size-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(245,180,0,.22), rgba(245,180,0,0) 70%)',
        }}
      />
      <div className="relative flex min-w-0 flex-[1_1_420px] flex-col gap-5.5">
        <HandNote color="var(--color-sun)" className="self-start">
          ding ding ding
        </HandNote>
        <h2 className="headline text-[clamp(40px,5.4vw,76px)] leading-[0.92]">
          Ready for the{' '}
          <span className="serif-accent text-sun">first bell?</span>
        </h2>
        <p className="max-w-[460px] text-[17px] leading-relaxed text-soft">
          Bring your timetable. In 30 minutes we&apos;ll show you your own
          school running on Dopple.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="#demo">Book my school&apos;s demo</LinkButton>
          <LinkButton href="#pricing" variant="outline-dark">
            See pricing
          </LinkButton>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-soft">
          <a href={`mailto:${contact.email}`} className="hover:text-paper">
            ✉ {contact.email}
          </a>
          <span>⌖ {contact.city}</span>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="relative h-[340px] min-w-0 flex-[1_1_360px]"
      >
        {collage.map(({ photo, className, position }) => (
          <Image
            key={photo.credit + position}
            src={photo.src}
            alt=""
            width={300}
            height={300}
            className={`absolute w-[46%] rounded-3xl border-[6px] border-paper object-cover shadow-[0_20px_50px_rgba(0,0,0,.5)] ${className}`}
            style={{ objectPosition: position }}
          />
        ))}
        <span className="float-a absolute right-[2%] bottom-0 z-20 -rotate-[4deg] rounded-xl bg-sun px-3.5 py-1 font-hand text-2xl font-bold text-ink">
          class of 2027!
        </span>
      </div>
    </div>
  );
}

function LinkColumns() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-18 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
      <div className="col-span-2 flex min-w-0 flex-col gap-4.5 md:col-span-1">
        <Logo size={34} />
        <p className="max-w-[360px] leading-relaxed text-soft">
          Live classes, exams, ID cards, bus tracking and school fees, on your
          school&apos;s own address.
        </p>
        <form className="flex max-w-[400px] flex-col gap-2.5" action="#">
          <label htmlFor="newsletter" className="text-sm font-semibold">
            One useful email a term. Ideas from schools, product news.
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="newsletter"
              type="email"
              placeholder="you@yourschool.edu"
              className="min-h-12 flex-[1_1_200px] rounded-full border border-iron bg-charcoal px-4.5 text-[15px] text-paper outline-none focus:border-soft"
            />
            <button
              type="submit"
              className="min-h-12 rounded-full bg-paper px-5 font-semibold text-ink"
            >
              Subscribe
            </button>
          </div>
        </form>
      </div>
      {footerLinks.map((column) => (
        <nav
          key={column.title}
          aria-label={column.title}
          className="flex flex-col gap-3.5 text-[15px]"
        >
          <span className="font-mono text-xs tracking-widest text-[#8e8a7f] uppercase">
            {column.title}
          </span>
          {column.links.map(([label, href]) => (
            <a key={label} href={href} className="text-soft hover:text-paper">
              {label}
            </a>
          ))}
        </nav>
      ))}
    </div>
  );
}

const legal = ['Privacy', 'Terms', 'NDPA notice', 'Cookies'];
const pill =
  'inline-flex h-9 items-center rounded-full border border-line bg-ink px-3.5 text-[13px] text-sand hover:border-muted hover:text-paper';
const iconButton =
  'flex size-10 items-center justify-center rounded-full border border-line bg-ink text-sand hover:border-muted';

function BottomStrip() {
  return (
    <>
      {/* Ruler edge */}
      <div
        aria-hidden="true"
        className="mt-2 h-3.5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--color-iron) 0 1px, transparent 1px 12px), repeating-linear-gradient(90deg, var(--color-muted) 0 1px, transparent 1px 60px)',
          backgroundSize: '100% 7px, 100% 14px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left bottom, left bottom',
        }}
      />
      <div className="mb-8 grid grid-cols-1 items-center gap-5 rounded-b-[28px] border border-t-0 border-line bg-charcoal px-6 py-4.5 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-4">
          <Stamp />
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold">
              © <CopyrightYear /> Dopple
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#8e8a7f]">
              All rights reserved ·
              <details className="relative">
                <summary className="text-sand underline underline-offset-[3px]">
                  Photo credits
                </summary>
                <p className="absolute bottom-7 left-0 z-10 w-[300px] rounded-2xl bg-paper px-4 py-3.5 text-[13px] leading-normal text-ink shadow-[0_20px_50px_rgba(0,0,0,.5)]">
                  Photos from Unsplash by {photoCredits.join(', ')}.
                </p>
              </details>
            </span>
          </div>
        </div>
        <nav
          aria-label="Legal"
          className="flex flex-wrap gap-2 lg:justify-center"
        >
          {legal.map((label) => (
            <a key={label} href="#" className={pill}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span className={pill}>🌐&nbsp; EN · ₦ NGN</span>
          <a href="#" aria-label="Dopple on X" className={iconButton}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 2l10 10M12 2 2 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </a>
          <a href="#" aria-label="Dopple on Instagram" className={iconButton}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="1.5"
                y="1.5"
                width="11"
                height="11"
                rx="3.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle
                cx="7"
                cy="7"
                r="2.6"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </a>
          <a href="#" aria-label="Dopple on LinkedIn" className={iconButton}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 5.5v6M2.5 2.5v.5M6 11.5v-6M6 8c0-1.5 1-2.6 2.4-2.6s2.1 1 2.1 2.6v3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </a>
          <a
            href="#top"
            className="flex h-10 items-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink"
          >
            ↑ Back to top
          </a>
        </div>
      </div>
    </>
  );
}

/** The current year, refreshed daily (Cache Components can't read the clock while prerendering). */
async function CopyrightYear() {
  'use cache';
  cacheLife('days');
  return new Date().getFullYear();
}

/** Rotating "Made in Lagos" stamp. */
function Stamp() {
  return (
    <svg
      className="stamp-spin flex-none"
      viewBox="0 0 100 100"
      width="72"
      height="72"
      role="img"
      aria-label="Made in Lagos, for schools everywhere"
    >
      <defs>
        <path
          id="stamp-ring"
          d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0"
        />
      </defs>
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="var(--color-sun)"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      <text fontFamily="var(--font-mono)" fontSize="8" fill="var(--color-sun)">
        <textPath href="#stamp-ring" textLength="236" lengthAdjust="spacing">
          MADE IN LAGOS · FOR SCHOOLS EVERYWHERE ·
        </textPath>
      </text>
      <circle cx="50" cy="50" r="20" fill="var(--color-sun)" />
      <circle cx="45" cy="50" r="6" fill="var(--color-ink)" />
      <circle
        cx="56"
        cy="50"
        r="6"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.4"
      />
    </svg>
  );
}
