import { redirect } from 'next/navigation';
import { getHomeZone, getSettingsProfile, getWorkspaceBilling } from '@jade/db';
import { availableZones } from '@jade/atlas';
import {
  ASPECTS,
  AYANAMSA_LABELS,
  IMPLEMENTED_CHART_STYLES,
  aspectAngle,
  IMPLEMENTED_HOUSE_SYSTEMS,
  PLANNED_CHART_STYLES,
  PLANNED_HOUSE_SYSTEMS,
  isFittedAyanamsa,
} from '@jade/astro';
import { AYANAMSA_OPTIONS, UNFITTED_AYANAMSAS } from '@/lib/ayanamsaOptions';
import { aspectSettingsOrDefaults } from '@/lib/aspectForm';
import { SettingsTabs } from '@/components/SettingsTabs';
import { HOUSE_SYSTEM_HINTS, HOUSE_SYSTEM_LABELS } from '@/lib/houseSystems';
import { getSession } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlements';
import { PlanPanel } from '@/components/PlanPanel';
import { getDatabase } from '@/lib/db';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { SubmitButton } from '@/components/SubmitButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ZonePicker } from '@/components/ZonePicker';
import { updateSettings } from '@/app/actions';

export const dynamic = 'force-dynamic';

/**
 * Ayanāṁśa choices.
 *
 * Each carries a plain description, because "which ayanāṁśa" is the single
 * most consequential setting in the app and the names alone assume you already
 * know. A student changing this should be able to see what it does to the
 * chart and read what she just chose — and, when Jade cannot cast in one yet,
 * read that too rather than discovering it as a broken page afterwards.
 *
 * The list itself is `lib/ayanamsaOptions.ts`, derived from the core so a
 * zodiac cannot be offered that the core cannot compute.
 */

/**
 * An aspect's angle in degrees, minutes and seconds.
 *
 * Shown to the second because the seventh-harmonic aspects are not round
 * numbers — a septile is 51°25′43″ — and rounding them to a degree would hide
 * the thing that makes the generated angles worth having.
 */
function formatAngle(degrees: number): string {
  const whole = Math.floor(degrees);
  const minutesTotal = (degrees - whole) * 60;
  const minutes = Math.floor(minutesTotal);
  const seconds = Math.round((minutesTotal - minutes) * 60);
  return `${whole}° ${String(minutes).padStart(2, '0')}′ ${String(seconds).padStart(2, '0')}″`;
}

const STYLE_LABELS: Record<string, string> = {
  north: 'North Indian',
  south: 'South Indian',
  east: 'East Indian (Bengali)',
  western_wheel: 'Western wheel',
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-[13px] text-[var(--ink-muted)]">{hint}</span> : null}
    </div>
  );
}

const SELECT =
  'border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] ' +
  'focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const [profile, homeZone, entitlement, billing] = await Promise.all([
    getSettingsProfile(getDatabase(), session.workspaceId, null),
    getHomeZone(getDatabase(), session.workspaceId),
    getEntitlement(session.workspaceId),
    getWorkspaceBilling(getDatabase(), session.workspaceId),
  ]);
  const zones = availableZones();

  const saved = searchParams.saved === '1';
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;

  if (!profile) {
    return (
      <Shell email={session.email}>
        <Kicker>Settings</Kicker>
        <h1 className="mb-6 font-display text-4xl">No profile yet</h1>
        <Panel>
          <p className="text-[var(--ink-muted)]">
            This workspace has no settings profile. Add a person — one is created with the first
            chart.
          </p>
        </Panel>
      </Shell>
    );
  }

  /** The stored aspect settings, or the core's defaults when none are stored. */
  const aspectSettings = aspectSettingsOrDefaults(profile.aspectSettings);

  return (
    <Shell email={session.email}>
      <div className="mb-6">
        <Kicker>Settings</Kicker>
        <h1 className="font-display text-4xl">The lens</h1>
        <p className="mt-2 max-w-[62ch] text-[var(--ink-muted)]">
          Every chart records which of these produced it, so changing them here never rewrites
          anything already computed — it changes what the next chart is computed with.
        </p>
      </div>

      <PlanPanel
        entitlement={entitlement}
        subscription={{
          status: billing?.subscriptionStatus ?? null,
          periodEnd: billing?.subscriptionPeriodEnd ?? null,
          hasCustomer: Boolean(billing?.stripeCustomerId),
        }}
      />

      {saved ? (
        <p className="mb-4 border border-[var(--jade)] bg-[var(--surface)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--jade)]">
          Saved
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 border border-[var(--clay,#9E5B3A)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--clay,#9E5B3A)]">
          {error}
        </p>
      ) : null}

      {/*
        A workspace already stored in an unfitted zodiac.

        The guard in `updateSettings` stops this happening from now on, but a
        profile saved before it existed is still sitting in a frame the core
        refuses, and every page that casts a chart fails until it changes. This
        page is the one that still loads — it casts nothing — so it is where the
        sentence explaining that belongs.
      */}
      {!isFittedAyanamsa(profile.ayanamsa) ? (
        <p className="mb-4 border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed">
          This workspace is set to{' '}
          <strong>{AYANAMSA_LABELS[profile.ayanamsa] ?? profile.ayanamsa}</strong>, which Jade names
          but has not fitted against a reference yet. No chart can be cast until you choose one of
          the zodiacs below that is available. Jade refuses rather than quietly substituting a
          different one.
        </p>
      ) : null}

      <form action={updateSettings} className="flex flex-col gap-4">
        <input type="hidden" name="profileId" value={profile.id} />

        <SettingsTabs labels={['Frame', 'Aspects', 'Chart', 'Practice']}>
          <div className="flex flex-col gap-4">
            <Panel>
              <h2 className="mb-4 font-display text-2xl">Frame of reference</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Ayanāṁśa"
                  hint="The offset between the tropical and sidereal zodiacs. Two astrologers disagreeing about this is normal; software that hides which one it used is not."
                >
                  <select name="ayanamsa" defaultValue={profile.ayanamsa} className={SELECT}>
                    {AYANAMSA_OPTIONS.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                        disabled={!option.fitted}
                        title={option.note}
                      >
                        {option.name}
                        {option.fitted ? '' : ' — not yet fitted'}
                      </option>
                    ))}
                  </select>
                  {UNFITTED_AYANAMSAS.length > 0 ? (
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                      {UNFITTED_AYANAMSAS.map((option) => option.name).join(', ')}{' '}
                      {UNFITTED_AYANAMSAS.length === 1 ? 'is' : 'are'} named here but not yet fitted
                      against a reference, so no chart can be cast in{' '}
                      {UNFITTED_AYANAMSAS.length === 1 ? 'it' : 'them'} yet. Jade refuses rather
                      than substituting a zodiac you did not choose.
                    </p>
                  ) : null}
                </Field>

                <Field
                  label="Custom value at J2000"
                  hint="Degrees. Only used when Ayanāṁśa is set to Custom offset."
                >
                  <input
                    type="number"
                    name="customAyanamsaAtJ2000"
                    step="0.000001"
                    min="0"
                    max="360"
                    defaultValue={profile.customAyanamsaAtJ2000 ?? ''}
                    placeholder="23.85"
                    className={SELECT}
                  />
                </Field>

                <Field
                  label="Node type"
                  hint="Mean nodes move steadily; true nodes wobble and can briefly go direct. Most Vedic software uses mean."
                >
                  {/*
                    Named `nodes`, not `nodeType`. An HTMLFormElement exposes its
                    named controls as properties *over* its own built-ins, so a
                    field called `nodeType` makes `form.nodeType` return the
                    <select> instead of the number 1 — and React's hydration
                    reads exactly that to decide the form is an element. The
                    whole page fell back to client rendering because of it.
                    `settings-field-names.test.ts` keeps it from coming back.
                  */}
                  <select name="nodes" defaultValue={profile.nodeType} className={SELECT}>
                    <option value="mean">Mean (Rāhu/Ketu)</option>
                    <option value="true">True</option>
                  </select>
                </Field>

                <Field
                  label="Position basis"
                  hint="Apparent applies light-time and aberration — the astronomical standard. True is geometric, which is what Jagannātha Hora computes. They differ by up to 55 arcseconds."
                >
                  <select
                    name="positionBasis"
                    defaultValue={profile.positionBasis}
                    className={SELECT}
                  >
                    <option value="apparent">Apparent</option>
                    <option value="true">True (geometric)</option>
                  </select>
                </Field>
              </div>
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel>
              <h2 className="mb-1 font-display text-2xl">Aspects by degree</h2>
              <p className="mb-4 max-w-[70ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
                Jade&rsquo;s own aspect model is whole-sign dṛṣṭi, and it has no settings: a graha
                aspects the third, seventh and tenth signs from itself, and that is the rule. This
                is the other model, in which an aspect is an angle that holds within an orb. Turn on
                what you read. Every angle below is computed from its harmonic, so the seconds are
                exact.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <caption className="pb-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                    Orbs in degrees. Applying is a pair closing on the aspect; separating is a pair
                    moving apart.
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--rule)] text-left font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                      <th className="w-10 py-2 pr-2 font-normal">On</th>
                      <th className="py-2 pr-3 font-normal">Aspect</th>
                      <th className="py-2 pr-3 font-normal">Angle</th>
                      <th className="py-2 pr-3 font-normal">Type</th>
                      <th className="py-2 pr-3 font-normal">Quality</th>
                      <th className="py-2 pr-3 font-normal">Applying</th>
                      <th className="py-2 font-normal">Separating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ASPECTS.map((definition) => {
                      const setting = aspectSettings[definition.id]!;
                      return (
                        <tr key={definition.id} className="border-b border-[var(--rule)]">
                          <td className="py-1.5 pr-2">
                            <input
                              type="checkbox"
                              name={`aspect:${definition.id}:on`}
                              defaultChecked={setting.on}
                              aria-label={`Read ${definition.name}`}
                            />
                          </td>
                          <td className="py-1.5 pr-3">
                            <span
                              aria-hidden="true"
                              className="mr-1.5 font-mono text-[var(--ink-faint)]"
                            >
                              {definition.glyph}
                            </span>
                            {definition.name}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                            {formatAngle(aspectAngle(definition))}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                            {definition.type}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                            {definition.quality}
                          </td>
                          <td className="py-1.5 pr-3">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="15"
                              name={`aspect:${definition.id}:applying`}
                              defaultValue={setting.applying}
                              aria-label={`${definition.name} applying orb, degrees`}
                              className="w-20 border border-[var(--rule-strong)] bg-transparent px-2 py-1 text-right font-mono text-[12px] tabular-nums"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="15"
                              name={`aspect:${definition.id}:separating`}
                              defaultValue={setting.separating}
                              aria-label={`${definition.name} separating orb, degrees`}
                              className="w-20 border border-[var(--rule-strong)] bg-transparent px-2 py-1 text-right font-mono text-[12px] tabular-nums"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 max-w-[70ch] font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
                The wheel prints which engine drew its lines. Both can be on at once; they are drawn
                in different stroke families so the two are never confused.
              </p>
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel>
              <h2 className="mb-4 font-display text-2xl">Houses and display</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="House system"
                  hint="Which twelve divisions a graha is placed in. Whole sign is the Vedic default; the others are here because practitioners argue about the grahas near a boundary, and the argument is worth being able to see."
                >
                  <select name="houseSystem" defaultValue={profile.houseSystem} className={SELECT}>
                    {IMPLEMENTED_HOUSE_SYSTEMS.map((id) => (
                      <option key={id} value={id}>
                        {HOUSE_SYSTEM_LABELS[id] ?? id}
                      </option>
                    ))}
                    {/*
                      Shown but unselectable. Hiding them entirely invites the same
                      question every few months; naming them with the reason answers
                      it once. Disabled options are never submitted, and the server
                      action rejects them anyway.
                    */}
                    {PLANNED_HOUSE_SYSTEMS.map(({ id, note }) => (
                      <option key={id} value={id} disabled>
                        {HOUSE_SYSTEM_LABELS[id] ?? id} — {note}
                      </option>
                    ))}
                  </select>

                  {/*
                    All four spelled out rather than one hint that changes with
                    the selection. Somebody choosing between them wants to read
                    the differences side by side, and a hint that only describes
                    what is already selected is the least useful moment to show
                    it.
                  */}
                  <dl className="mt-3 flex flex-col gap-1.5">
                    {IMPLEMENTED_HOUSE_SYSTEMS.map((id) => (
                      <div key={id}>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                          {HOUSE_SYSTEM_LABELS[id] ?? id}
                        </dt>
                        <dd className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
                          {HOUSE_SYSTEM_HINTS[id]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Field>

                <Field label="Chart style" hint="Which diagram a chart is drawn as by default.">
                  <select name="chartStyle" defaultValue={profile.chartStyle} className={SELECT}>
                    {IMPLEMENTED_CHART_STYLES.map((id) => (
                      <option key={id} value={id}>
                        {STYLE_LABELS[id] ?? id}
                      </option>
                    ))}
                    {PLANNED_CHART_STYLES.map(({ id, note }) => (
                      <option key={id} value={id} disabled>
                        {STYLE_LABELS[id] ?? id} — {note}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Outer planets"
                  hint="Uranus, Neptune and Pluto. Classical Jyotiṣa does not use them; some modern practitioners do."
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="includeOuters"
                      defaultChecked={profile.includeOuters}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    Include them in charts
                  </label>
                </Field>

                <Field label="Profile name" hint="What this set of choices is called.">
                  <input type="text" name="name" defaultValue={profile.name} className={SELECT} />
                </Field>
              </div>
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel>
              <h2 className="mb-1 font-display text-2xl">Your clock</h2>
              <p className="mb-4 max-w-[62ch] text-[13px] text-[var(--ink-muted)]">
                Where this practice reads its clock. This is not part of the lens — it changes
                nothing about any chart — but it decides which day Jade calls today, and therefore
                which day the home page is computed for. Left unset, everything is shown in UTC,
                which for anywhere west of Greenwich means the date is wrong for part of every day.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Time zone"
                  hint="Birth times are unaffected — every birth event stores its own zone and offset, resolved from the birthplace."
                >
                  <ZonePicker zones={zones} value={homeZone ?? ''} />
                </Field>
              </div>
            </Panel>
          </div>
        </SettingsTabs>

        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
          <span className="font-mono text-[11px] text-[var(--ink-muted)]">
            Charts already computed keep the lens they were computed with.
          </span>
        </div>
      </form>

      <Panel className="mt-4">
        <h2 className="mb-1 font-display text-2xl">Appearance</h2>
        <p className="mb-4 max-w-[58ch] text-[13px] text-[var(--ink-muted)]">
          Kept on this device rather than on your account, so a laptop at night and a phone outdoors
          can differ.
        </p>
        <ThemeToggle />
      </Panel>

      <Panel className="mt-4">
        <h2 className="mb-1 font-display text-2xl">Your data</h2>
        <p className="max-w-[62ch] text-[13px] text-[var(--ink-muted)]">
          Every person can be exported as JSON or deleted permanently from their own page. Birth
          data is never sent to a third-party model.
        </p>
      </Panel>
    </Shell>
  );
}
