import { LinkButton } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { plans } from '@/lib/content';

export function Pricing() {
  return (
    <section id="pricing" className="bg-paper text-ink">
      <Container className="py-30">
        <h2 className="headline text-[clamp(36px,5vw,64px)]">
          Priced per student, <span className="serif-accent">per term.</span>
        </h2>
        <p className="mt-4 max-w-[620px] text-[17px] leading-relaxed text-muted">
          One line in your budget, billed when your term starts. Every plan
          includes your own web address, data isolation and the ability to
          export everything, any time.
        </p>
        <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col gap-4 rounded-[28px] p-8 ${plan.featured ? 'bg-ink text-paper' : 'border border-rule bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {plan.featured ? (
                  <span className="rounded-full bg-sun px-2.5 py-1 text-xs font-semibold text-ink">
                    Most chosen
                  </span>
                ) : null}
              </div>
              <div className="font-display text-[44px] font-bold tracking-tight">
                {plan.price}
              </div>
              <p
                className={`leading-normal ${plan.featured ? 'text-soft' : 'text-muted'}`}
              >
                {plan.body}
              </p>
              <LinkButton
                href="#demo"
                variant={plan.featured ? 'sun' : 'outline-light'}
                className="mt-auto !py-3.5"
              >
                {plan.cta}
              </LinkButton>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
