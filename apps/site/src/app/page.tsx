import { Suspense } from 'react';
import { BeforeAfter } from '@/components/sections/BeforeAfter';
import { Faq } from '@/components/sections/Faq';
import { FeatureTapes } from '@/components/sections/FeatureTapes';
import { FinalCta } from '@/components/sections/FinalCta';
import { Footer } from '@/components/sections/Footer';
import { Hero } from '@/components/sections/Hero';
import { Library } from '@/components/sections/Library';
import { LiveClass } from '@/components/sections/LiveClass';
import { Modules } from '@/components/sections/Modules';
import { Nav } from '@/components/sections/Nav';
import { Onboarding } from '@/components/sections/Onboarding';
import { PartnerSchools } from '@/components/sections/PartnerSchools';
import { PhotoBand } from '@/components/sections/PhotoBand';
import { Pricing } from '@/components/sections/Pricing';
import { Promises } from '@/components/sections/Promises';
import { Reliability } from '@/components/sections/Reliability';
import { Roles } from '@/components/sections/Roles';
import { SchoolDay } from '@/components/sections/SchoolDay';

/**
 * Landing page. Section order follows the buyer's questions:
 * is this for me → who already uses it → what's the pain → who it serves →
 * how it works → what's included → can I trust it → what does it cost → next step.
 */
export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <FeatureTapes />
      <Suspense fallback={null}>
        <PartnerSchools />
      </Suspense>
      <BeforeAfter />
      <Roles />
      <LiveClass />
      <PhotoBand />
      <Modules />
      <SchoolDay />
      <Onboarding />
      <Library />
      <Promises />
      <Reliability />
      <Faq />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  );
}
