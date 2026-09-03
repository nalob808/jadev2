/**
 * Shared furniture for the terms and privacy pages.
 *
 * Deliberately plain: no panels, no accents, wide leading and a real measure.
 * These are the two pages on the site somebody reads when they are worried,
 * and decorating them makes them harder to read at exactly the wrong moment.
 */

export function LegalPage({
  title,
  updated,
  lede,
  children,
}: {
  title: string;
  updated: string;
  lede: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <article className="mx-auto max-w-[68ch] px-5 pb-24 pt-14 sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        Last updated {updated}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">{lede}</p>
      <div className="mt-10 flex flex-col gap-8">{children}</div>
    </article>
  );
}

export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold">{heading}</h2>
      <div className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed text-[var(--ink-muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--ink)]">
        {children}
      </div>
    </section>
  );
}
