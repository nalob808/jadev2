import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ELEMENT_LABELS, MODALITY_LABELS, SIGNS_LIB, signByName } from '@jade/interpret';
import { CallToAction } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

export function generateStaticParams() {
  return SIGNS_LIB.map((sign) => ({ name: sign.name.toLowerCase() }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const sign = signByName(params.name);
  if (!sign) return {};
  const path = `/learn/signs/${sign.name.toLowerCase()}`;
  return {
    title: `${sign.name} (${sign.sanskrit}) in Vedic astrology — sidereal`,
    description: `${sign.summary} Modality, element, ruling graha and what it means for a graha placed there — sidereal, with the classical source named.`,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title: `${sign.name} — ${sign.sanskrit}`,
      description: sign.summary,
      url: `${SITE_URL}${path}`,
      type: 'article',
    },
  };
}

export default function SignPage({ params }: { params: { name: string } }) {
  const sign = signByName(params.name);
  if (!sign) notFound();

  const next = SIGNS_LIB[(sign.index + 1) % 12]!;
  const previous = SIGNS_LIB[(sign.index + 11) % 12]!;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Learn', path: '/learn' },
          { name: sign.name, path: `/learn/signs/${sign.name.toLowerCase()}` },
        ])}
      />

      <article className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 lg:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Rāśi {sign.index + 1} · {sign.sanskrit} · {sign.plain}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.06]">
          {sign.name}
        </h1>
        <p className="mt-3 text-[18px] leading-relaxed text-[var(--ink-muted)]">{sign.summary}</p>

        <dl className="mt-6 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
          {[
            { term: 'Modality', detail: MODALITY_LABELS[sign.modality] },
            { term: 'Element', detail: ELEMENT_LABELS[sign.element] },
            { term: 'Ruled by', detail: sign.lord },
          ].map((row) => (
            <div key={row.term} className="bg-[var(--surface)] px-4 py-3">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                {row.term}
              </dt>
              <dd className="mt-1 text-[13px] text-[var(--ink-muted)]">{row.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col gap-5 text-[17px] leading-[1.75] text-[var(--ink-muted)]">
          {sign.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 border-t border-[var(--rule)] pt-5">
          <ul className="flex flex-wrap gap-2">
            {sign.keywords.map((keyword) => (
              <li
                key={keyword}
                className="border border-[var(--rule)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-muted)]"
              >
                {keyword}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[10px] text-[var(--ink-faint)]">
            Source: {sign.source}
          </p>
        </div>

        <nav className="mt-10 flex justify-between gap-4 border-t border-[var(--rule)] pt-5 text-sm">
          <Link
            href={`/learn/signs/${previous.name.toLowerCase()}`}
            className="text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
          >
            ← {previous.name}
          </Link>
          <Link
            href={`/learn/signs/${next.name.toLowerCase()}`}
            className="text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
          >
            {next.name} →
          </Link>
        </nav>
      </article>

      <div className="px-5 sm:px-8">
        <CallToAction />
      </div>
    </>
  );
}
