import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { photos } from '@/lib/photos';

const faces = [photos.studentPortrait, photos.graduate, photos.pupilsUniform];

export function FinalCta() {
  return (
    <section id="demo" className="bg-paper text-ink">
      <Container className="pb-30">
        <div className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[36px] bg-sun px-[clamp(28px,4vw,48px)] py-14 md:py-16">
          <div className="relative">
            <div aria-hidden="true" className="mb-5 flex">
              {faces.map((face, i) => (
                <Image
                  key={i}
                  src={face.src}
                  alt=""
                  width={64}
                  height={64}
                  className={`size-16 rounded-full border-[3px] border-sun object-cover ${i ? '-ml-3.5' : ''} ${i % 2 ? 'float-b' : 'float-a'}`}
                />
              ))}
            </div>
            <h2 className="headline relative max-w-[560px] text-[clamp(36px,4.6vw,60px)] leading-[0.95]">
              See your school on Dopple{' '}
              <span className="serif-accent">in 30 minutes.</span>
            </h2>
          </div>
          <form
            className="relative flex flex-[0_1_460px] flex-wrap gap-2.5"
            action="#demo"
          >
            <label htmlFor="cta-email" className="sr-only">
              School email
            </label>
            <input
              id="cta-email"
              type="email"
              required
              placeholder="you@yourschool.edu"
              className="min-h-14 flex-[1_1_240px] rounded-full bg-white px-5.5 text-base text-ink outline-none focus:ring-2 focus:ring-ink"
            />
            <button
              type="submit"
              className="min-h-14 rounded-full bg-ink px-6.5 text-base font-semibold text-paper"
            >
              Book my school&apos;s demo
            </button>
          </form>
        </div>
      </Container>
    </section>
  );
}
