import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  HOUSES,
  HOUSE_CLASS_LABELS,
  HOUSE_GROUP_LABELS,
  houseSignification,
} from '@jade/interpret';
import { CallToAction } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

/** Prerendered, so all twelve are static HTML a crawler gets in one hop. */
export function generateStaticParams() {
  return HOUSES.map((house) => ({ number: String(house.number) }));
}

export function generateMetadata({ params }: { params: { number: string } }): Metadata {
  const house = houseSignification(Number(params.number));
  if (!house) return {};
  const path = `/learn/houses/${house.number}`;
  return {
    title: `The ${house.number}${['st', 'nd', 'rd'][house.number - 1] ?? 'th'} house in Vedic astrology — ${house.plain.split(' / ')[0]}`,
    description: `${house.summary} What the ${house.sanskrit} governs, its kāraka, and how it is classified — with the classical source named.`,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title: `The ${house.number}th house — ${house.title}`,
      description: house.summary,
      url: `${SITE_URL}${path}`,
      type: 'article',
    },
  };
}

export default function HousePage({ params }: { params: { number: string } }) {
  const house = houseSignification(Number(params.number));
  if (!house) notFound();

  const previous = houseSignification(house.number === 1 ? 12 : house.number - 1)!;
  const next = houseSignification(house.number === 12 ? 1 : house.number + 1)!;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Learn', path: '/learn' },
          { name: `House ${house.number}`, path: `/learn/houses/${house.number}` },
        ])}
      />

      <article className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 lg:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          House {house.number} · {house.sanskrit} · {house.plain}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.06]">
          {house.title}
        </h1>
        <p className="mt-3 text-[18px] leading-relaxed text-[var(--ink-muted)]">{house.summary}</p>

        <dl className="mt-6 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
          <div className="bg-[var(--surface)] px-4 py-3">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Angularity
            </dt>
            <dd className="mt-1 text-[13px] text-[var(--ink-muted)]">
              {HOUSE_GROUP_LABELS[house.group]}
            </dd>
          </div>
          <div className="bg-[var(--surface)] px-4 py-3">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Classified as
            </dt>
            <dd className="mt-1 text-[13px] text-[var(--ink-muted)]">
              {house.classes
                .map((c) => HOUSE_CLASS_LABELS[c])
                .filter(Boolean)
                .join(' · ') || '—'}
            </dd>
          </div>
          <div className="bg-[var(--surface)] px-4 py-3">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Kāraka
            </dt>
            <dd className="mt-1 text-[13px] text-[var(--ink-muted)]">
              {house.karaka} — signifies these matters wherever it falls
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-5 text-[17px] leading-[1.75] text-[var(--ink-muted)]">
          {house.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 border-t border-[var(--rule)] pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Significations
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {house.keywords.map((keyword) => (
              <li
                key={keyword}
                className="border border-[var(--rule)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-muted)]"
              >
                {keyword}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[10px] text-[var(--ink-faint)]">
            Source: {house.source}
          </p>
        </div>

        <nav className="mt-10 flex justify-between gap-4 border-t border-[var(--rule)] pt-5 text-sm">
          <Link
            href={`/learn/houses/${previous.number}`}
            className="text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
          >
            ← {previous.number}. {previous.title}
          </Link>
          <Link
            href={`/learn/houses/${next.number}`}
            className="text-right text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
          >
            {next.number}. {next.title} →
          </Link>
        </nav>
      </article>

      <div className="px-5 sm:px-8">
        <CallToAction
          title="See this house in your own chart"
          body="Jade shows what occupies it, what aspects it, and what its lord is doing — with the placements behind every statement."
        />
      </div>
    </>
  );
}
