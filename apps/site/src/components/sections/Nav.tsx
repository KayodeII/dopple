import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

const links = [
  ['Product', '#product'],
  ['Modules', '#modules'],
  ['Library', '#library'],
  ['Pricing', '#pricing'],
] as const;

export function Nav() {
  // z-30: above the hero (z-20), whose content layer would otherwise cover these links.
  return (
    <header className="absolute inset-x-0 top-0 z-30 text-ink">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-5"
      >
        <Logo />
        <div className="hidden gap-1.5 rounded-full border border-rule bg-white/80 p-1.5 text-[15px] backdrop-blur md:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 hover:bg-paper"
            >
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href="/login" className="px-3.5 py-3 text-[15px]">
            Log in
          </a>
          <LinkButton
            href="#demo"
            variant="ink"
            className="!px-4.5 !py-3 text-[15px]"
          >
            Book a demo
          </LinkButton>
        </div>
      </nav>
    </header>
  );
}
