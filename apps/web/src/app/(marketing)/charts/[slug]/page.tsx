import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dashaChainAt, nakshatraOf, SIGNS } from '@jade/astro';
import { figuresBornOn, getPublicFigure, listPublicFigures } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { LIBRARY_LENS, RODDEN, castFigure } from '@/lib/publicChart';
import { FigureCard, bornLabel } from '@/components/marketing/FigureCard';
import { UntimedChart } from '@/components/marketing/UntimedChart';
import { JsonLd, breadcrumbSchema } from '@/components/marketing/JsonLd';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const figure = await getPublicFigure(getDatabase(), slug);
  if (!figure) return { title: 'Chart not found | Jade' };
  return {
    title: `${figure.displayName} — Vedic birth chart | Jade`,
    description: `${figure.displayName}, born ${bornLabel(figure)} in ${figure.placeName}. Sidereal chart with the birth time rated ${figure.rodden}.`,
    alternates: { canonical: `https://jadeapp.co/charts/${figure.slug}` },
  };
}

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

function degreesWithin(longitude: number): string {
  const within = (((longitude % 360) + 360) % 360) % 30;
  const whole = Math.floor(within);
  const minutes = Math.round((within - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * One figure's chart page.
 *
 * Ordered the way an astrologer reads: who this is, then the three or four
 * facts they want at a glance, then the chart, then the provenance. The
 * provenance is not a footnote — it sits directly under the birth data,
 * because on a page meant to teach from, how well the time is attested is part
 * of the birth data rather than a caveat about it.
 */
export default async function FigurePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const database = getDatabase();
  const figure = await getPublicFigure(database, slug);
  if (!figure) notFound();

  const cast = castFigure(figure);
  const rating = RODDEN[figure.rodden];

  const [month, day] = figure.birthDate.split('-').slice(1).map(Number);
  const [alsoBorn, sameTag] = await Promise.all([
    figuresBornOn(database, month!, day!),
    figure.tags[0] ? listPublicFigures(database, { tag: figure.tags[0], limit: 7 }) : [],
  ]);

  // The glance: what a Jyotiṣī looks for first. Only shown when there is a
  // time — every item in it depends on one.
  let glance: Array<{ label: string; value: string; detail?: string }> = [];
  if (cast.kind === 'timed') {
    const { chart } = cast;
    const moon = chart.points.Moon!;
    const nak = nakshatraOf(moon.longitude);
    const chain = dashaChainAt(cast.dasha, cast.jdUt);
    glance = [
      {
        label: 'Lagna',
        value: SIGNS[chart.houses.ascendantSign]!,
        detail: degreesWithin(chart.points.Ascendant?.longitude ?? 0),
      },
      {
        label: 'Moon',
        value: SIGNS[Math.floor(moon.longitude / 30)]!,
        detail: degreesWithin(moon.longitude),
      },
      { label: 'Nakṣatra', value: nak.name, detail: `pāda ${nak.pada}` },
      {
        label: 'Daśā at birth',
        value: chain[0]?.lord ?? '—',
        detail:
          chain
            .slice(1)
            .map((p) => p.lord)
            .join(' → ') || undefined,
      },
    ];
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Public charts', path: '/charts' },
          { name: figure.displayName, path: `/charts/${figure.slug}` },
        ])}
      />

      <article className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8">
        {/* ------------------------------------------------------- heading */}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          <Link href="/charts" className="hover:text-[var(--ink)]">
            Public charts
          </Link>
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
          {figure.displayName}
        </h1>
        {figure.alsoKnownAs ? (
          <p className="mt-1 text-[15px] text-[var(--ink-muted)]">{figure.alsoKnownAs}</p>
        ) : null}

        {figure.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {figure.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/charts/tag/${encodeURIComponent(tag)}`}
                  className="border border-[var(--rule-strong)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-5 max-w-[68ch] text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
          {figure.summary}
        </p>

        {/* --------------------------------------------------- birth data */}
        <div className="mt-8 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
          <div className="bg-[var(--surface)] px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Born
            </p>
            <p className="mt-1 font-display text-xl">
              {bornLabel(figure)}
              {figure.birthTime ? (
                <span className="ml-2 font-mono text-sm text-[var(--ink-muted)]">
                  {figure.birthTime.slice(0, 5)}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{figure.placeName}</p>
            {figure.diedOn ? (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                died {figure.diedOn}
              </p>
            ) : null}
          </div>

          <div className="bg-[var(--surface)] px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              How well the time is known
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span
                className="border px-1.5 py-0.5 font-mono text-[11px] font-medium"
                style={{
                  borderColor:
                    rating?.trust === 'high'
                      ? 'var(--jade)'
                      : rating?.trust === 'none'
                        ? 'var(--rule-strong)'
                        : 'var(--clay)',
                  color:
                    rating?.trust === 'high'
                      ? 'var(--jade)'
                      : rating?.trust === 'none'
                        ? 'var(--ink-faint)'
                        : 'var(--clay)',
                }}
              >
                {figure.rodden}
              </span>
              <span className="text-[13.5px]">{rating?.meaning}</span>
            </p>
            {figure.timeSource ? (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                {figure.timeSource}
              </p>
            ) : null}
            {figure.provenanceNote ? (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                {figure.provenanceNote}
              </p>
            ) : null}
          </div>
        </div>

        {/* -------------------------------------------------- the glance */}
        {glance.length > 0 ? (
          <div className="mt-4 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-4">
            {glance.map((item) => (
              <div key={item.label} className="bg-[var(--surface)] px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-xl">{item.value}</p>
                {item.detail ? (
                  <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">{item.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* --------------------------------------------------- the chart */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">The chart</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {LIBRARY_LENS.label}
          </p>

          <div className="mt-4">
            {cast.kind === 'untimed' ? (
              <UntimedChart day={cast.day} slug={figure.slug} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] border-collapse text-[13.5px]">
                  <caption className="sr-only">Graha positions</caption>
                  <thead>
                    <tr className="border-b border-[var(--rule-strong)] text-left">
                      <th
                        scope="col"
                        className="pb-1.5 pr-3 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                      >
                        Graha
                      </th>
                      <th
                        scope="col"
                        className="pb-1.5 pr-3 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                      >
                        Sign
                      </th>
                      <th
                        scope="col"
                        className="pb-1.5 pr-3 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                      >
                        Degree
                      </th>
                      <th
                        scope="col"
                        className="pb-1.5 pr-3 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                      >
                        House
                      </th>
                      <th
                        scope="col"
                        className="pb-1.5 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                      >
                        Nakṣatra
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cast.chart.points)
                      .filter(([id]) => id !== 'Ascendant')
                      .map(([id, point]) => {
                        const nak = nakshatraOf(point.longitude);
                        return (
                          <tr key={id} className="border-b border-[var(--rule)] last:border-0">
                            <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                              {id}
                            </th>
                            <td className="py-1.5 pr-3">
                              {SIGNS[Math.floor(point.longitude / 30)]}
                            </td>
                            <td className="py-1.5 pr-3 font-mono tabular-nums text-[var(--ink-muted)]">
                              {degreesWithin(point.longitude)}
                            </td>
                            <td className="py-1.5 pr-3 font-mono tabular-nums text-[var(--ink-muted)]">
                              {point.house != null ? ORDINALS[point.house - 1] : '—'}
                            </td>
                            <td className="py-1.5 font-mono text-[11px] text-[var(--ink-faint)]">
                              {nak.name} · {nak.pada}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* --------------------------------------------------- onward ways */}
        {alsoBorn.filter((f) => f.id !== figure.id).length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">
              Also born {bornLabel(figure).replace(/ \d{4}$/, '')}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alsoBorn
                .filter((f) => f.id !== figure.id)
                .slice(0, 3)
                .map((other) => (
                  <FigureCard key={other.id} figure={other} />
                ))}
            </ul>
          </section>
        ) : null}

        {sameTag.filter((f) => f.id !== figure.id).length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">More {figure.tags[0]}s</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sameTag
                .filter((f) => f.id !== figure.id)
                .slice(0, 3)
                .map((other) => (
                  <FigureCard key={other.id} figure={other} />
                ))}
            </ul>
          </section>
        ) : null}

        {figure.sourceUrl ? (
          <footer className="mt-12 border-t border-[var(--rule)] pt-4">
            <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
              Date and place from{' '}
              <a
                href={figure.sourceUrl}
                rel="noopener noreferrer nofollow"
                className="text-[var(--accent)] underline underline-offset-2"
              >
                this source
              </a>
              . Summary written for Jade. Jade does not predict death, disease or legal outcomes,
              and nothing on this page is a forecast.
            </p>
          </footer>
        ) : null}
      </article>
    </>
  );
}
