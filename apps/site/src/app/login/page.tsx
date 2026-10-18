import type { Metadata } from 'next';
import { PageIntro, PageShell } from '@/components/schools/PageShell';
import { SchoolSearch } from '@/components/schools/SchoolSearch';
import { findSchool } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Log in · Dopple',
  description: 'Find your school and go to its sign-in page.',
};

export default function LoginPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow={findSchool.eyebrow}
        title={findSchool.title}
        body={findSchool.body}
      />
      <SchoolSearch />
      <p className="text-[15px] text-muted">
        {findSchool.newSchool}{' '}
        <a
          href="/start"
          className="font-semibold text-ink underline underline-offset-4"
        >
          {findSchool.newSchoolCta}
        </a>
      </p>
    </PageShell>
  );
}
