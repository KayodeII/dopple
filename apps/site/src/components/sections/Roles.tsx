import Image from 'next/image';
import { Container, SectionHeader } from '@/components/ui/Container';
import { Marked } from '@/components/ui/Text';
import { roles } from '@/lib/content';
import { photos } from '@/lib/photos';

export function Roles() {
  return (
    <section className="bg-paper text-ink">
      <Container className="pt-10 pb-30">
        <SectionHeader
          title={
            <>
              One school. <Marked>Four ways in.</Marked>
            </>
          }
          aside="Everyone signs in at the school's own address and sees only what's theirs."
        />
        <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
          {roles.map((role) => {
            const photo = photos[role.photo];
            return (
              <article
                key={role.tag}
                className="zoom-on-hover relative h-[500px] overflow-hidden rounded-[28px] bg-graphite text-paper shadow-[0_24px_60px_rgba(11,11,10,.18)]"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 300px, 50vw"
                  className="object-cover"
                  style={{ objectPosition: role.focus }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                <div className="absolute inset-x-6 bottom-6 flex flex-col gap-2.5">
                  <span
                    className="self-start rounded-full px-2.5 py-1 text-xs font-bold text-ink"
                    style={{ background: role.tagColor }}
                  >
                    {role.tag}
                  </span>
                  <h3 className="font-display text-[28px] leading-[1.05] font-bold">
                    {role.title}{' '}
                    <span className="serif-accent">{role.accent}</span>
                  </h3>
                  <p className="text-sm leading-normal text-sand">
                    {role.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
