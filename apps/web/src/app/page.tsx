import {
  AstronomyEngineProvider,
  computeChart,
  formatSignPosition,
  SIGNS,
  jdFromCivil,
  vimshottari,
  dashaChainAt,
} from '@jade/astro';
import { GLYPHS } from '@jade/ui';

export const dynamic = 'force-dynamic';

/**
 * Phase 0 smoke page: proves the calculation core runs inside Next.js and
 * renders a real chart. Phase 3 replaces this with the chart workspace.
 */
export default function Home() {
  const provider = new AstronomyEngineProvider();

  // The v0 reference chart, so this page and legacy/jade-v0.html can be
  // compared side by side while the rebuild is in progress.
  const jdUt = jdFromCivil(2001, 11, 7, 10, 32, 0, -300);
  const chart = computeChart(provider, {
    jdUt,
    location: { latitude: 42.2808, longitude: -83.743 },
  });
  const dashas = vimshottari(chart.points.Moon!.longitude, jdUt, { levels: 3 });
  const chain = dashaChainAt(dashas, jdUt);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-6xl tracking-widest">JADE</h1>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[var(--ink-muted)]">
        phase 0 · calculation core online
      </p>

      <section className="mt-10 border border-[var(--rule)] bg-[var(--surface)] p-6">
        <h2 className="font-display text-2xl">Reference chart — 7 Nov 2001, Ann Arbor</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Ayanāṁśa {chart.meta.ayanamsaMode} · {chart.meta.ayanamsaValue.toFixed(6)}° · provider{' '}
          {chart.meta.provider}
        </p>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-[var(--ink-muted)]">
              <th className="pb-2">Graha</th>
              <th className="pb-2">Position</th>
              <th className="pb-2">Nakṣatra</th>
              <th className="pb-2">House</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {Object.values(chart.points).map((p) => (
              <tr key={p.id} className="border-t border-[var(--rule)]">
                <td className="py-1">
                  {GLYPHS[p.id as keyof typeof GLYPHS]} {p.id}
                  {p.retrograde ? ' ℞' : ''}
                </td>
                <td>{formatSignPosition(p.longitude, SIGNS)}</td>
                <td>
                  {p.nakshatra.name} · {p.nakshatra.pada}
                </td>
                <td>{p.house}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-sm">
          Vimśottarī at birth: {chain.map((c) => c.lord).join(' → ')} · balance{' '}
          {dashas.balanceAtBirthYears.toFixed(2)} years
        </p>
      </section>

      <p className="mt-8 text-sm text-[var(--ink-muted)]">
        The original prototype is preserved at{' '}
        <a className="underline" href="/legacy">
          /legacy
        </a>{' '}
        for side-by-side comparison.
      </p>
    </main>
  );
}
