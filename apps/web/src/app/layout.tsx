import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NavProgress } from '@/components/NavProgress';
import './globals.css';

/**
 * Site-wide metadata.
 *
 * `metadataBase` is what makes every relative Open Graph and canonical URL
 * resolve to an absolute one. Without it Next emits relative OG tags, which
 * most crawlers and every social preview silently drop — the page looks fine
 * and shares as a bare link.
 *
 * The title template means a page sets 'Pricing' and gets 'Pricing — Jade',
 * while the landing page overrides it outright.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://jadeapp.co'),
  title: {
    default: 'Jade — Vedic astrology software for serious practice',
    template: '%s | Jade',
  },
  description:
    'Professional Jyotiṣa software with verified classical mathematics: sixteen divisional charts, aṣṭakavarga, yogas, daśās, transits and relationship analysis. Free to start.',
  applicationName: 'Jade',
  keywords: [
    'vedic astrology software',
    'jyotish software',
    'sidereal astrology',
    'divisional charts',
    'ashtakavarga',
    'vimshottari dasha',
    'north indian chart',
    'ashtakuta matching',
    'professional astrology software',
  ],
  openGraph: { siteName: 'Jade', locale: 'en', type: 'website' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

/**
 * Apply the saved theme before the first paint.
 *
 * This has to be a blocking inline script rather than an effect. React runs
 * after hydration, which is one paint too late: the page renders in the
 * system theme and then snaps to the chosen one, and on a dark-mode laptop
 * that snap is a full-screen white flash.
 *
 * Wrapped in try/catch because a browser with site data blocked throws on the
 * `localStorage` getter itself, and a theme preference is not worth taking the
 * page down for.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('jade-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-body">
        {/*
          `useSearchParams` opts its subtree into client-side rendering, so it
          needs a boundary of its own. Without one, Next pulls every page into
          dynamic rendering to satisfy a two-pixel progress bar.
        */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
