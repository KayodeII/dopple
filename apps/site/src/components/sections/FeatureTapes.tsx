import { Star } from '@/components/ui/Text';
import { tapeWords } from '@/lib/content';

function Tape({ starColor }: { starColor: string }) {
  const items = [...tapeWords, ...tapeWords];
  return (
    <>
      {items.map((word, i) => (
        <span key={i} className="flex items-center gap-7 px-3.5">
          {word}
          <Star color={starColor} />
        </span>
      ))}
    </>
  );
}

/** Two crossing strips of tape listing what's included, scrolling in opposite directions. */
export function FeatureTapes() {
  return (
    <section
      aria-label="Everything included"
      className="relative h-[230px] overflow-hidden bg-paper"
    >
      <div className="absolute -inset-x-[5%] top-[60px] -rotate-3 overflow-hidden bg-ink py-4.5 font-display text-[34px] font-bold tracking-tight whitespace-nowrap text-paper">
        <div
          className="marquee"
          style={{ ['--marquee-duration' as string]: '40s' }}
        >
          <Tape starColor="var(--color-sun)" />
        </div>
      </div>
      <div className="absolute -inset-x-[5%] top-[112px] rotate-[2.5deg] overflow-hidden bg-sun py-4.5 font-serif text-[38px] whitespace-nowrap text-ink italic shadow-[0_12px_30px_rgba(11,11,10,.15)]">
        <div
          className="marquee marquee-reverse"
          style={{ ['--marquee-duration' as string]: '40s' }}
        >
          <Tape starColor="var(--color-ink)" />
        </div>
      </div>
    </section>
  );
}
