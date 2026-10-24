import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

/** Plain page frame for log-in and sign-up: the Dopple mark back home, then a centred column. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-[1240px] items-center px-6 py-5">
        <Logo href="/" />
      </header>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-6 pt-8 pb-20 md:pt-16">
        {children}
      </div>
    </main>
  );
}

export function PageIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-muted">{eyebrow}</p>
      <h1 className="headline text-[clamp(36px,6vw,56px)]">{title}</h1>
      <p className="text-[17px] leading-normal text-muted">{body}</p>
    </div>
  );
}
