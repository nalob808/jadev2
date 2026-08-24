import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GRAHAS_LIB, NATURE_LABELS } from '@jade/interpret';
import { CallToAction } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

export function generateStaticParams() {
  return GRAHAS_LIB.map((graha) => ({ id: graha.id.toLowerCase() }));
}

function findGraha(id: string) {
  return GRAHAS_LIB.find((graha) => graha.id.toLowerCase() === id.toLowerCase());
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const graha = findGraha(params.id);
  if (!graha) return {};
  const path = `/learn/grahas/${graha.id.toLowerCase()}`;
  return {
    title: `${graha.id} (${graha.plain}) in Vedic astrology — what it signifies`,
    description: `${graha.summary} What ${graha.sanskrit} signifies as kāraka, what it rules, where it is exalted and debilitated — with the classical source named.`,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title: `${graha.id} — ${graha.sanskrit}`,
      description: graha.summary,
      url: `${SITE_URL}${path}`,
      type: 'article',
    },
  };
}

export default function GrahaPage({ params }: { params: { id: string } }) {
  const graha = findGraha(params.id);
  if (!graha) notFound();
  const index = GRAHAS_LIB.findIndex((g) => g.id === graha.id);
  const next = GRAHAS_LIB[(index + 1) % GRAHAS_LIB.length]!;
  const previous = GRAHAS_LIB[(index + GRAHAS_LIB.length - 1) % GRAHAS_LIB.length]!;

  const facts = [
    { term: 'Nature', detail: NATURE_LABELS[graha.nature] },
    {
      term: 'Rules',
      detail: graha.rules.length
        ? graha.rules.join(' and ')
        : 'No sign — it is a point, not a body',
    },
    { term: 'Exalted', detail: graha.exalted ?? '—' },
    { term: 'Debilitated', detail: graha.debilitated ?? '—' },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Learn', path: '/learn' },
          { name: graha.id, path: `/learn/grahas/${graha.id.toLowerCase()}` },
        ])}
      />

      <article className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 lg:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          {graha.glyph}&#xFE0E; {graha.sanskrit} · {graha.plain}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.06]">
          {graha.id}
        </h1>
        <p className="mt-3 text-[18px] leading-relaxed text-[var(--ink-muted)]">{graha.summary}</p>

        <dl className="mt-6 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
          {facts.map((row) => (
            <div key={row.term} className="bg-[var(--surface)] px-4 py-3">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                {row.term}
              </dt>
              <dd className="mt-1 text-[13px] text-[var(--ink-muted)]">{row.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col gap-5 text-[17px] leading-[1.75] text-[var(--ink-muted)]">
          {graha.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 border-t border-[var(--rule)] pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Kāraka — what it signifies wherever it falls
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {graha.karaka.map((keyword) => (
              <li
                key={keyword}
                className="border border-[var(--rule)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-muted)]"
              >
                {keyword}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[10px] text-[var(--ink-faint)]">
            Source: {graha.source}
          </p>
        </div>

        <nav className="mt-10 flex justify-between gap-4 border-t border-[var(--rule)] pt-5 text-sm">
          <Link
            href={`/learn/grahas/${previous.id.toLowerCase()}`}
            className="text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
          >
            ← {previous.id}
          </Link>
          <Link
            href={`/learn/grahas/${next.id.toLowerCase()}`}
            className="text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
          >
            {next.id} →
          </Link>
        </nav>
      </article>

      <div className="px-5 sm:px-8">
        <CallToAction />
      </div>
    </>
  );
}
