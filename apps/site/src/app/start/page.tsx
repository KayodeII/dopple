import type { Metadata } from 'next';
import { PageIntro, PageShell } from '@/components/schools/PageShell';
import { StartSchoolForm } from '@/components/schools/StartSchoolForm';
import { startSchool } from '@/lib/content';
import { PLATFORM_DOMAIN } from '@/lib/schools';

export const metadata: Metadata = {
  title: 'Start your school · Dopple',
  description: 'Create your school on its own Dopple address.',
};

export default function StartPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow={startSchool.eyebrow}
        title={startSchool.title}
        body={startSchool.body}
      />
      <StartSchoolForm domain={PLATFORM_DOMAIN} />
      <p className="text-[15px] text-muted">
        {startSchool.haveSchool}{' '}
        <a
          href="/login"
          className="font-semibold text-ink underline underline-offset-4"
        >
          {startSchool.haveSchoolCta}
        </a>
      </p>
    </PageShell>
  );
}
