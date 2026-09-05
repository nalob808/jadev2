import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { figuresBornOn } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { FigureCard } from '@/components/marketing/FigureCard';
import { SectionHead } from '@/components/marketing/Site';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Everybody born on one date of the year.
 *
 * 366 evergreen pages that need no maintenance, and the one entry point that
 * answers a question the reader did not have to arrive with. February 29th is
 * allowed deliberately — people are born on it.
 */
function parse(month: string, day: string): { m: number; d: number } | null {
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > DAYS_IN[m - 1]!) return null;
  return { m, d };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string; day: string }>;
}): Promise<Metadata> {
  const { month, day } = await params;
  const parsed = parse(month, day);
  if (!parsed) return { title: 'Not a date | Jade' };
  const label = `${parsed.d} ${MONTHS[parsed.m - 1]}`;
  return {
    title: `Born on ${label} — Vedic birth charts | Jade`,
    description: `Notable people born on ${label}, with sidereal charts and how well each birth time is attested.`,
    alternates: { canonical: `https://jadeapp.co/charts/born/${parsed.m}/${parsed.d}` },
  };
}

export default async function BornOnPage({
  params,
}: {
  params: Promise<{ month: string; day: string }>;
}) {
  const { month, day } = await params;
  const parsed = parse(month, day);
  if (!parsed) notFound();

  const figures = await figuresBornOn(getDatabase(), parsed.m, parsed.d);
  const label = `${parsed.d} ${MONTHS[parsed.m - 1]}`;

  // Yesterday and tomorrow, wrapping the year, so the page is walkable.
  const step = (delta: number): string => {
    let m = parsed.m;
    let d = parsed.d + delta;
    if (d < 1) {
      m = m === 1 ? 12 : m - 1;
      d = DAYS_IN[m - 1]!;
    } else if (d > DAYS_IN[m - 1]!) {
      m = m === 12 ? 1 : m + 1;
      d = 1;
    }
    return `/charts/born/${m}/${d}`;
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8">
      <SectionHead
        kicker="Born on this day"
        title={label}
        as="h1"
        lede={
          figures.length === 0
            ? 'Nobody in the library yet was born on this date.'
            : `${figures.length} ${figures.length === 1 ? 'person' : 'people'} in the library share this birthday.`
        }
      />

      <nav
        aria-label="Nearby dates"
        className="mt-5 flex gap-4 font-mono text-[10px] uppercase tracking-wider"
      >
        <Link href={step(-1)} className="text-[var(--accent)] hover:underline">
          ← day before
        </Link>
        <Link href="/charts" className="text-[var(--ink-faint)] hover:text-[var(--ink)]">
          the whole library
        </Link>
        <Link href={step(1)} className="text-[var(--accent)] hover:underline">
          day after →
        </Link>
      </nav>

      {figures.length > 0 ? (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {figures.map((figure) => (
            <FigureCard key={figure.id} figure={figure} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
