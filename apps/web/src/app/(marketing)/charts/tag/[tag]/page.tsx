import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPublicFigures, publicFigureTags } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { FigureCard } from '@/components/marketing/FigureCard';
import { SectionHead } from '@/components/marketing/Site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  return {
    title: `Birth charts of ${name}s — Vedic astrology | Jade`,
    description: `Sidereal birth charts of notable ${name}s, each rated for how well its birth time is attested.`,
    alternates: { canonical: `https://jadeapp.co/charts/tag/${tag}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  const database = getDatabase();

  const [figures, tags] = await Promise.all([
    listPublicFigures(database, { tag: name }),
    publicFigureTags(database),
  ]);
  // An unknown tag is a 404 rather than an empty page — an empty grid under a
  // confident heading reads as "we have none of these" when the truth is that
  // the word is not one we use.
  if (figures.length === 0) notFound();

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8">
      <SectionHead
        kicker="Browse"
        title={name.charAt(0).toUpperCase() + name.slice(1) + 's'}
        as="h1"
        lede={`${figures.length} in the library.`}
      />

      <ul className="mt-6 flex flex-wrap gap-2">
        {tags
          .filter((other) => other.tag !== name)
          .slice(0, 12)
          .map(({ tag: other, count }) => (
            <li key={other}>
              <Link
                href={`/charts/tag/${encodeURIComponent(other)}`}
                className="inline-flex items-baseline gap-1.5 border border-[var(--rule-strong)] px-2.5 py-1 text-[13px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {other}
                <span className="font-mono text-[10px] tabular-nums text-[var(--ink-faint)]">
                  {count}
                </span>
              </Link>
            </li>
          ))}
      </ul>

      <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {figures.map((figure) => (
          <FigureCard key={figure.id} figure={figure} />
        ))}
      </ul>
    </section>
  );
}
