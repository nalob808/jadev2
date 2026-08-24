import { SiteFooter, SiteHeader } from '@/components/marketing/Site';

/**
 * The public site.
 *
 * A route group rather than a path segment, so these pages sit at `/`,
 * `/pricing` and `/features` — the URLs a search result should show — while
 * keeping their own chrome, separate from the signed-in app.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
