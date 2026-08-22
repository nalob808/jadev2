import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSettingsProfile, getSubject } from '@jade/db';
import { formatSignPosition, POINT_DISPLAY_ORDER, SIGNS } from '@jade/astro';
import { formatOffset, offsetWarning, TIME_ACCURACY_MINUTES } from '@jade/atlas';
import { GLYPHS } from '@jade/ui';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { removePerson } from '@/app/actions';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const record = await getSubject(getDatabase(), session.workspaceId, id);
  if (!record) notFound();

  const { subject, birthEvent } = record;
  if (!birthEvent) notFound();

  const profile = await getSettingsProfile(
    getDatabase(),
    session.workspaceId,
    session.settingsProfileId,
  );
  if (!profile) notFound();

  const { chart, cacheHit } = await getOrComputeChart(session.workspaceId, birthEvent, profile);
  const uncertaintyMinutes = TIME_ACCURACY_MINUTES[birthEvent.timeAccuracy];

  const warning = offsetWarning({
    offsetMinutes: birthEvent.utcOffsetMinutes,
    source: birthEvent.offsetSource,
    ambiguous: birthEvent.offsetAmbiguous,
    confidence: birthEvent.offsetAmbiguous ? 'best-effort' : 'high',
    note: (birthEvent.offsetNote ?? undefined) as undefined,
    zoneId: birthEvent.timezoneId,
  });

  return (
    <Shell email={session.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{subject.relationship.replace('_', ' ')}</Kicker>
          <h1 className="font-display text-4xl">{subject.displayName}</h1>
          <p className="font-mono text-[11px] text-[var(--ink-muted)]">
            {birthEvent.localDatetime.replace('T', ' ').slice(0, 16)} ·{' '}
            {formatOffset(birthEvent.utcOffsetMinutes)} · {birthEvent.placeName}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <a className="underline" href={`/api/people/${subject.id}/export`}>
            export
          </a>
          <form action={removePerson}>
            <input type="hidden" name="id" value={subject.id} />
            <button type="submit" className="underline">
              remove
            </button>
          </form>
        </div>
      </div>

      {warning ? (
        <p className="mb-5 border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--surface)] px-4 py-3 text-sm">
          {warning}
        </p>
      ) : null}

      {uncertaintyMinutes > 0 ? (
        <p className="mb-5 border-l-2 border-[var(--rule)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-muted)]">
          The birth time is given as accurate to about {uncertaintyMinutes} minutes, which moves the
          ascendant by roughly {(uncertaintyMinutes / 4).toFixed(0)}° either way. Everything
          house-dependent below inherits that uncertainty.
        </p>
      ) : null}

      <Panel>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <Kicker>Rāśi — sidereal positions</Kicker>
          <span className="font-mono text-[10px] text-[var(--ink-muted)]">
            {chart.meta.ayanamsaMode} {chart.meta.ayanamsaValue.toFixed(4)}° ·{' '}
            {cacheHit ? 'cached' : 'computed'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                <th className="pb-2">Graha</th>
                <th className="pb-2">Position</th>
                <th className="hidden pb-2 sm:table-cell">Nakṣatra</th>
                {/* Navāṁśa and house fold into the first column on a phone
                    rather than pushing the table into a sideways scroll. */}
                <th className="hidden pb-2 sm:table-cell">Navāṁśa</th>
                <th className="hidden pb-2 sm:table-cell">House</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {POINT_DISPLAY_ORDER.map((pointId) => chart.points[pointId])
                .filter((point) => point !== undefined)
                .map((point) => (
                  <tr key={point.id} className="border-t border-[var(--rule)] align-top">
                    <td className="py-1.5 pr-3">
                      <span className="whitespace-nowrap">
                        {GLYPHS[point.id as keyof typeof GLYPHS]} {point.id}
                        {point.retrograde ? ' ℞' : ''}
                      </span>
                      <span className="block text-[10px] text-[var(--ink-muted)] sm:hidden">
                        D9 {SIGNS[chart.vargas[point.id]!.D9]!.slice(0, 3)} · H{point.house}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className="whitespace-nowrap">
                        {formatSignPosition(point.longitude, SIGNS)}
                      </span>
                      {/* Three monospace columns do not fit a 390px phone, so
                          the nakṣatra rides under the position there. */}
                      <span className="block text-[10px] text-[var(--ink-muted)] sm:hidden">
                        {point.nakshatra.name} · {point.nakshatra.pada}
                      </span>
                    </td>
                    <td className="hidden py-1.5 pr-3 sm:table-cell">
                      {point.nakshatra.name}
                      <span className="text-[var(--ink-muted)]"> · {point.nakshatra.pada}</span>
                    </td>
                    <td className="hidden py-1.5 pr-3 sm:table-cell">
                      {SIGNS[chart.vargas[point.id]!.D9]}
                    </td>
                    <td className="hidden py-1.5 sm:table-cell">{point.house}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {chart.vargottama.length > 0 ? (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">
            Vargottama (same sign in D1 and D9): {chart.vargottama.join(', ')}
          </p>
        ) : null}
      </Panel>

      <p className="mt-6 text-sm text-[var(--ink-muted)]">
        The wheel, the varga grid, aṣṭakavarga and the daśā column arrive in Phase 3 —{' '}
        <Link className="underline" href="/people">
          back to your people
        </Link>
        .
      </p>
    </Shell>
  );
}
