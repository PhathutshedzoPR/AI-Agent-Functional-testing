import type { Metadata } from 'next';
import { Instrument_Serif, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';

// Self-hosted at build time by next/font: no font requests at runtime (CLAUDE.md section 9).
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'TestPilot', template: '%s | TestPilot' },
  description: 'An AI agent for functional testing that runs every step in a real browser.',
};

export default function RootLayout({ children }: Readonly<LayoutProps<'/'>>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
