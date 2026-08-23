/**
 * Evaluate every enabled watch and record what it finds.
 *
 *   pnpm watches:run            # evaluate, record, print a summary
 *   pnpm watches:run -- --dry   # evaluate and print, write nothing
 *
 * It lives in the worker rather than in `@jade/db` because it needs the
 * calculation core, and the database package deliberately does not depend on
 * it — that separation is what lets the schema be reasoned about without
 * dragging an ephemeris in behind it.
 *
 * It is a script rather than a service on purpose: idempotent, no arguments
 * that change its meaning, so anything that can run a command on a schedule can
 * run it. The long-running worker will call this, not reimplement it.
 *
 * Re-running is safe and is the expected case. Hit keys are derived from the
 * event, not from when the job ran, so the second run over an overlapping
 * window finds the same events and the unique index drops them. Only genuinely
 * new hits come back, which is exactly the set worth notifying about.
 */
import {
  AstronomyEngineProvider,
  computeChart,
  evaluateWatch,
  jdFromUnixMs,
  vimshottari,
  type WatchRule,
  type WatchSubject,
} from '@jade/astro';
import {
  createDatabase,
  getSettingsProfile,
  getSubject,
  listWatches,
  recordWatchHits,
  requireDatabaseUrl,
  workspaces,
} from '@jade/db';

const dryRun = process.argv.includes('--dry');

function unixMsFromJd(jdUt: number): number {
  return (jdUt - 2440587.5) * 86400000;
}

async function main(): Promise<void> {
  const db = createDatabase(requireDatabaseUrl('direct'));
  const provider = new AstronomyEngineProvider();

  // Every workspace, because a nightly job serves all of them. The per-query
  // workspace binding still applies inside each iteration.
  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);

  const nowJd = jdFromUnixMs(Date.now());
  let evaluated = 0;
  let found = 0;
  let recorded = 0;

  for (const workspace of allWorkspaces) {
    const watchList = await listWatches(db, { workspaceId: workspace.id });

    for (const watch of watchList) {
      if (!watch.enabled) continue;
      evaluated += 1;

      const record = await getSubject(db, workspace.id, watch.subjectId);
      if (!record?.birthEvent) continue;
      const profile = await getSettingsProfile(db, workspace.id, null);
      if (!profile) continue;

      const birthJd = jdFromUnixMs(new Date(record.birthEvent.utcDatetime).getTime());
      const chart = computeChart(
        provider,
        {
          jdUt: birthJd,
          location: {
            latitude: Number(record.birthEvent.latitude),
            longitude: Number(record.birthEvent.longitude),
          },
        },
        {
          ayanamsa: profile.ayanamsa,
          customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
          nodeType: profile.nodeType,
          houseSystem: profile.houseSystem,
          positionBasis: profile.positionBasis,
          includeOuters: profile.includeOuters,
        },
      );

      const subject: WatchSubject = {
        ascendantSign: chart.houses.ascendantSign,
        natalLongitudeOf: Object.fromEntries(
          Object.entries(chart.points).map(([id, p]) => [id, p.longitude]),
        ),
      };

      const hits = evaluateWatch(
        watch.rule as WatchRule,
        subject,
        { fromJd: nowJd, toJd: nowJd + watch.horizonDays },
        {
          provider,
          frame: {
            ayanamsa: profile.ayanamsa,
            customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
          },
          dasha: vimshottari(chart.points.Moon!.longitude, birthJd, { levels: 3 }),
        },
      );
      found += hits.length;

      if (dryRun) {
        for (const hit of hits) {
          console.log(`  [dry] ${watch.subject.displayName}: ${hit.title}`);
        }
        continue;
      }

      const inserted = await recordWatchHits(db, {
        workspaceId: workspace.id,
        watchId: watch.id,
        hits: hits.map((h) => ({
          key: h.key,
          occursAt: new Date(unixMsFromJd(h.jdUt)),
          title: h.title,
          factors: h.factors,
        })),
      });
      recorded += inserted.length;
      for (const row of inserted) {
        console.log(`  new · ${watch.subject.displayName}: ${row.title}`);
      }
    }
  }

  console.log(
    `${evaluated} watch(es) evaluated, ${found} event(s) in horizon, ${
      dryRun ? 0 : recorded
    } newly recorded${dryRun ? ' (dry run)' : ''}.`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
