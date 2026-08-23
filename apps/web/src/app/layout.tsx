import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NavProgress } from '@/components/NavProgress';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jade',
  description: 'The practice OS for Vedic astrology.',
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
