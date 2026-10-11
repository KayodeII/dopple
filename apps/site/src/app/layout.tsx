import type { Metadata } from 'next';
// Fonts are self-hosted from npm (no request to Google at runtime or build time).
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dopple · Your whole school, in session',
  description:
    "Live classes, exams, ID cards, bus tracking and school fees on your school's own web address.",
  openGraph: {
    title: 'Dopple · Your whole school, in session',
    description:
      'Teach live, run exams, track every bus and collect fees straight into your school’s account.',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
