'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wheel, Glyph, type WheelPoint, type WheelAspect } from '@jade/ui';
import type { FocusFacts } from '@/lib/focusIndex';

/**
 * The wheel as a workspace rather than a figure on somebody's page.
 *
 * Everything on this screen reads one piece of state — which graha is focused —
 * so selecting Saturn in the wheel lights its row in the rail, swaps the panel,
 * and dims the rest of the chart together. Three separate widgets sharing a
 * page would each have needed their own; one focus makes it an instrument.
 *
 * Selection is held here rather than inside the wheel because the panel beside
 * it needs to read the same value. The wheel keeps its own internal state when
 * `focus` is not passed, which is what the printable report and the public
 * library still rely on.
 */

export interface WorkspacePerson {
  readonly id: string;
  readonly name: string;
  readonly born: string;
}

export function WheelWorkspace({
  people,
  currentId,
  overlayId,
  points,
  aspects,
  overlayPoints,
  overlayName,
  ascendant,
  ascendantSign,
  sarva,
  facts,
  lens,
  timeCaveat,
}: {
  people: readonly WorkspacePerson[];
  currentId: string;
  overlayId: string | null;
  points: readonly WheelPoint[];
  aspects: readonly WheelAspect[];
  overlayPoints: readonly WheelPoint[];
  overlayName: string | null;
  ascendant: number;
  ascendantSign: number;
  sarva: readonly number[];
  facts: Record<string, FocusFacts>;
  lens: string;
  /** Present when the birth time is uncertain, so the wheel says so. */
  timeCaveat: string | null;
}): React.ReactElement {
  const router = useRouter();
  const [focus, setFocus] = useState<string | null>(null);
  const focused = focus ? facts[focus] : null;

  const go = (personId: string, overlay: string | null): void => {
    const query = new URLSearchParams({ person: personId });
    if (overlay) query.set('overlay', overlay);
    router.push(`/wheel?${query.toString()}`);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)_19rem]">
      {/* ------------------------------------------------------- the people */}
      <aside className="order-2 lg:order-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          Your people
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {people.map((person) => {
            const current = person.id === currentId;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => go(person.id, overlayId)}
                  aria-current={current ? 'true' : undefined}
                  className={`w-full border px-3 py-2 text-left transition-colors ${
                    current
                      ? 'border-[var(--accent)] bg-[var(--surface)]'
                      : 'border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span className="block font-display text-lg leading-tight">{person.name}</span>
                  <span className="block font-mono text-[10px] text-[var(--ink-faint)]">
                    {person.born}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* ------------------------------------------------------ overlay */}
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          Overlay a second chart
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
          Their grahas ride the outer ring against this chart&rsquo;s houses.
        </p>
        <select
          value={overlayId ?? ''}
          onChange={(event) => go(currentId, event.target.value || null)}
          aria-label="Overlay another person's chart"
          className="mt-2 w-full border border-[var(--rule)] bg-[var(--surface)] px-2 py-1.5 text-sm"
        >
          <option value="">Nobody — this chart alone</option>
          {people
            .filter((person) => person.id !== currentId)
            .map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
        </select>
        {overlayId ? (
          <Link
            href={`/relationships`}
            className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
          >
            Read them together →
          </Link>
        ) : null}
      </aside>

      {/* -------------------------------------------------------- the wheel */}
      <div className="order-1 min-w-0 lg:order-2">
        {overlayName ? (
          <p className="mb-2 flex flex-wrap items-center gap-x-3 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-[var(--ink)]">inner · this chart</span>
            <span className="text-[var(--clay)]">outer · {overlayName}</span>
          </p>
        ) : null}

        <Wheel
          points={points}
          aspects={aspects}
          transits={overlayPoints}
          ascendant={ascendant}
          ascendantSign={ascendantSign}
          sarva={sarva}
          focus={focus}
          onFocusChange={setFocus}
          size={640}
        />

        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {lens}
        </p>
        {timeCaveat ? (
          <p className="mt-1 border-l-2 border-[var(--clay)] py-1 pl-2 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            {timeCaveat}
          </p>
        ) : null}
      </div>

      {/* -------------------------------------------------------- the panel */}
      <aside className="order-3 min-w-0">
        {focused ? (
          <FocusPanel facts={focused} onClear={() => setFocus(null)} />
        ) : (
          <div className="border border-dashed border-[var(--rule-strong)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Nothing selected
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
              Tap any graha in the wheel and everything Jade knows about it gathers here — its
              dignity, its bindus, the yogas it forms, the periods it rules, and whatever you have
              written about it.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {Object.keys(facts)
                .filter((id) => id !== 'Ascendant')
                .map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setFocus(id)}
                      title={id}
                      className="flex h-9 w-9 items-center justify-center border border-[var(--rule)] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <Glyph name={id as never} size={18} title={id} />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
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

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Everything about the focused graha, in the order a practitioner asks for it:
 * where it is, what condition it is in, what it is bound up with, and what you
 * have already said about it.
 */
function FocusPanel({
  facts,
  onClear,
}: {
  facts: FocusFacts;
  onClear: () => void;
}): React.ReactElement {
  return (
    <div className="border border-[var(--accent)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--rule)] px-4 py-3">
        <span className="text-[var(--accent)]">
          <Glyph name={facts.id as never} size={26} weight={1.8} title={facts.id} />
        </span>
        <span className="font-display text-2xl leading-none">{facts.id}</span>
        {facts.runningNow ? (
          <span className="border border-[var(--jade)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--jade)]">
            running
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
        >
          clear
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-[var(--rule)]">
        <Cell label="Sign" value={`${degrees(facts.degreesInSign)} ${facts.sign}`} />
        <Cell
          label="House"
          value={facts.house != null ? ORDINALS[facts.house - 1]! : 'not counted'}
        />
        <Cell label="Nakṣatra" value={`${facts.nakshatra} · ${facts.pada}`} />
        <Cell label="Nakṣatra lord" value={facts.nakshatraLord} />
        <Cell label="Dignity" value={facts.dignity ?? 'none stated'} />
        <Cell
          label="Bindus"
          value={
            facts.bindusInOwnSign != null
              ? `${facts.bindusInOwnSign} own · ${facts.sarvaOfSign} sarva`
              : '—'
          }
        />
      </dl>

      {facts.combustion || facts.retrograde ? (
        <p className="border-t border-[var(--rule)] px-4 py-2 font-mono text-[11px] text-[var(--clay)]">
          {[facts.retrograde ? 'retrograde' : null, facts.combustion].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {facts.yogas.length > 0 ? (
        <section className="border-t border-[var(--rule)] px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Yogas it forms
          </p>
          <ul className="mt-1.5 flex flex-col gap-2">
            {facts.yogas.map((yoga) => (
              <li key={yoga.id}>
                <p className="text-[13.5px] font-medium">{yoga.name}</p>
                <p className="font-mono text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
                  {yoga.factors.join(' · ')}
                </p>
                {yoga.cancellations && yoga.cancellations.length > 0 ? (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--clay)]">
                    Cancelled by: {yoga.cancellations.join('; ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {facts.periods.length > 0 ? (
        <section className="border-t border-[var(--rule)] px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Periods it rules
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
            {facts.periods.slice(0, 6).map((period, index) => (
              <li key={`${period.level}-${index}`}>{period.level}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {facts.notes.length > 0 ? (
        <section className="border-t border-[var(--rule)] px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            What you wrote
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {facts.notes.slice(0, 4).map((note) => (
              <li key={note.id} className="text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                {note.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="bg-[var(--surface)] px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--ink-faint)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px]">{value}</dd>
    </div>
  );
}
