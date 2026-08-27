import { redirect } from 'next/navigation';
import { getHomeZone, getSettingsProfile } from '@jade/db';
import { availableZones } from '@jade/atlas';
import {
  IMPLEMENTED_CHART_STYLES,
  IMPLEMENTED_HOUSE_SYSTEMS,
  PLANNED_CHART_STYLES,
  PLANNED_HOUSE_SYSTEMS,
} from '@jade/astro';
import { getSession } from '@/lib/auth';
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
 * chart and read what she just chose.
 */
const AYANAMSAS: Array<{ id: string; name: string; note: string }> = [
  {
    id: 'lahiri',
    name: 'Lahiri (Chitrapakṣa)',
    note: 'The Indian government standard. Most widely used.',
  },
  {
    id: 'lahiri_true_chitra',
    name: 'True Citrā',
    note: 'Spica fixed at exactly 180°. Differs from Lahiri by minutes.',
  },
  { id: 'raman', name: 'Raman', note: 'B. V. Raman’s value.' },
  { id: 'krishnamurti', name: 'Krishnamurti (KP)', note: 'Required for KP technique.' },
  { id: 'yukteshwar', name: 'Yukteshwar', note: 'From The Holy Science.' },
  { id: 'fagan_bradley', name: 'Fagan–Bradley', note: 'The Western sidereal standard.' },
  { id: 'suryasiddhanta', name: 'Sūrya Siddhānta', note: 'The classical text’s own value.' },
  { id: 'custom', name: 'Custom', note: 'Your own value at J2000, in degrees.' },
];

const HOUSE_LABELS: Record<string, string> = {
  whole_sign: 'Whole sign',
  equal: 'Equal',
  sripati: 'Śrīpati',
  placidus: 'Placidus',
};

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

  const [profile, homeZone] = await Promise.all([
    getSettingsProfile(getDatabase(), session.workspaceId, null),
    getHomeZone(getDatabase(), session.workspaceId),
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

      <form action={updateSettings} className="flex flex-col gap-4">
        <input type="hidden" name="profileId" value={profile.id} />

        <Panel>
          <h2 className="mb-4 font-display text-2xl">Frame of reference</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Ayanāṁśa"
              hint="The offset between the tropical and sidereal zodiacs. Two astrologers disagreeing about this is normal; software that hides which one it used is not."
            >
              <select name="ayanamsa" defaultValue={profile.ayanamsa} className={SELECT}>
                {AYANAMSAS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Custom value at J2000"
              hint="Degrees. Only used when Ayanāṁśa is set to Custom."
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
              <select name="nodeType" defaultValue={profile.nodeType} className={SELECT}>
                <option value="mean">Mean (Rāhu/Ketu)</option>
                <option value="true">True</option>
              </select>
            </Field>

            <Field
              label="Position basis"
              hint="Apparent applies light-time and aberration — the astronomical standard. True is geometric, which is what Jagannātha Hora computes. They differ by up to 55 arcseconds."
            >
              <select name="positionBasis" defaultValue={profile.positionBasis} className={SELECT}>
                <option value="apparent">Apparent</option>
                <option value="true">True (geometric)</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-1 font-display text-2xl">Your clock</h2>
          <p className="mb-4 max-w-[62ch] text-[13px] text-[var(--ink-muted)]">
            Where this practice reads its clock. This is not part of the lens — it changes nothing
            about any chart — but it decides which day Jade calls today, and therefore which day the
            home page is computed for. Left unset, everything is shown in UTC, which for anywhere
            west of Greenwich means the date is wrong for part of every day.
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

        <Panel>
          <h2 className="mb-4 font-display text-2xl">Houses and display</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="House system"
              hint="Whole sign is the Vedic default — house one is the entire sign the ascendant falls in."
            >
              <select name="houseSystem" defaultValue={profile.houseSystem} className={SELECT}>
                {IMPLEMENTED_HOUSE_SYSTEMS.map((id) => (
                  <option key={id} value={id}>
                    {HOUSE_LABELS[id] ?? id}
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
                    {HOUSE_LABELS[id] ?? id} — {note}
                  </option>
                ))}
              </select>
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
