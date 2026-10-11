import { Container } from '@/components/ui/Container';
import { Marked } from '@/components/ui/Text';
import {
  crestFor,
  getShowcaseSchools,
  SHOWCASE_MIN_SCHOOLS,
  type ShowcaseSchool,
} from '@/lib/showcase';

/**
 * Logo wall of schools that opted in (GET /showcase/schools on the API).
 * Renders nothing until enough schools have opted in: no placeholder logos, ever.
 */
export async function PartnerSchools() {
  const schools = await getShowcaseSchools();
  if (schools.length < SHOWCASE_MIN_SCHOOLS) return null;

  const half = Math.ceil(schools.length / 2);
  const rows = [schools.slice(0, half), schools.slice(half)].map(fillRow);

  return (
    <section
      id="partners"
      aria-label="Partner schools"
      className="bg-paper text-ink"
    >
      <Container className="flex flex-wrap items-end justify-between gap-6 pt-18 pb-6">
        <h2 className="headline max-w-[640px] text-[clamp(30px,3.6vw,48px)] leading-none">
          Schools already <Marked>ringing the bell</Marked> with Dopple.
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-display text-[56px] leading-none font-extrabold tracking-[-0.05em]">
            {schools.length}
          </span>
          <span className="text-sm leading-snug text-muted">
            schools
            <br />
            and counting
          </span>
        </div>
      </Container>
      <div className="marquee-pause edge-fade flex flex-col gap-4 overflow-hidden pt-6 pb-24">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`marquee gap-4 ${i ? 'marquee-reverse' : ''}`}
            style={{ ['--marquee-duration' as string]: i ? '58s' : '50s' }}
          >
            {[...row, ...row].map((school, j) => (
              <SchoolLogo
                key={`${school.slug}-${j}`}
                school={school}
                hidden={j >= row.length}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Repeat a short row so one copy is at least ~8 logos wide (the marquee shows two copies). */
function fillRow(row: ShowcaseSchool[]): ShowcaseSchool[] {
  if (row.length === 0) return row;
  const copies = Math.ceil(8 / row.length);
  return Array.from({ length: copies }, () => row).flat();
}

function SchoolLogo({
  school,
  hidden,
}: {
  school: ShowcaseSchool;
  hidden: boolean;
}) {
  const crest = crestFor(school);
  return (
    <div
      aria-hidden={hidden || undefined}
      className="flex flex-none items-center gap-3.5 rounded-[20px] border border-rule bg-white py-3.5 pr-5.5 pl-3.5 opacity-70 grayscale transition hover:-translate-y-1 hover:opacity-100 hover:grayscale-0"
    >
      {school.logoUrl ? (
        // School-uploaded logos come from arbitrary hosts; a plain img avoids image-domain config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={school.logoUrl}
          alt=""
          className="h-[58px] w-[52px] rounded-xl object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[58px] w-[52px] flex-col items-center justify-center rounded-t-xl rounded-b-[26px] font-serif text-xl text-white"
          style={{ background: crest.color }}
        >
          {crest.initials}
        </span>
      )}
      <span className="flex flex-col gap-0.5 whitespace-nowrap">
        <span className="font-display text-[17px] font-bold tracking-tight">
          {school.name}
        </span>
        {school.city ? (
          <span className="text-[13px] text-muted">{school.city}</span>
        ) : null}
      </span>
    </div>
  );
}
