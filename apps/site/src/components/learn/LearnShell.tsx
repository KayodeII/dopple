import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

/** Frame for Dopple Learn: the Dopple mark home, a "Learn" link, and a readable column. */
export function LearnShell({
  crumbs = [],
  children,
}: {
  crumbs?: { label: string; href?: string }[];
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-5 sm:px-6">
        <Logo href="/" />
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/learn" className="font-semibold text-ink">
                Learn
              </Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.label} className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-12 px-4 pt-6 pb-20 sm:px-6 md:pt-10">
        {children}
      </div>
    </main>
  );
}
