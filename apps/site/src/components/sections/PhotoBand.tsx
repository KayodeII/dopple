import Image from 'next/image';
import { photos } from '@/lib/photos';

export function PhotoBand() {
  const photo = photos.teacherAtBoard;
  return (
    <section className="relative h-[640px] overflow-hidden bg-ink">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="100vw"
        className="ken-burns object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 to-ink/5" />
      <div className="relative mx-auto flex h-full max-w-[1240px] flex-col justify-center gap-5 px-6">
        <span className="eyebrow text-sun">Made for real classrooms</span>
        <h2 className="headline max-w-[760px] text-[clamp(40px,6vw,84px)] leading-[0.95]">
          Every child in the lesson.{' '}
          <span className="serif-accent text-sun">
            Even on a weak connection.
          </span>
        </h2>
        <p className="max-w-[520px] text-lg leading-relaxed text-sand">
          Video steps down to audio and slides, the whiteboard keeps working
          offline, and lessons can be saved for later.
        </p>
      </div>
    </section>
  );
}
