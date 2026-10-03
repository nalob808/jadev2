'use client';

import { useState } from 'react';
import { SIGNS } from '@jade/astro';
import {
  DASHA_LEVELS,
  DASHA_LORDS,
  NATAL_POINTS,
  TRANSITING_BODIES,
  WATCH_KINDS,
} from '@/lib/watchForm';

/**
 * The part of the watch form that changes with what you are watching for.
 *
 * ## Why this is a client component and the rest of the form is not
 *
 * Four rule kinds need four different sets of fields, and showing all of them
 * at once makes a form nobody can read. Rendering only the relevant set needs
 * one piece of state — which kind is selected — and nothing else.
 *
 * It is deliberately only this piece. The surrounding `<form>`, the person
 * picker, the horizon and the submit are server-rendered, so the form still
 * posts and still validates if this never hydrates: every field below is a
 * plain named input, and `parseWatchForm` reads the submission rather than
 * anything this component tracks.
 *
 * ## Why the fields are rendered, not hidden
 *
 * Only the selected kind's inputs are in the DOM. A hidden input is still
 * submitted, so leaving the others mounted would send an `intoSign` along with
 * a station rule — which the parser would ignore, but which makes the posted
 * form and the stored rule two different documents for no reason.
 */
type Kind = (typeof WATCH_KINDS)[number]['id'];

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]';
const FIELD = 'border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2 text-[15px]';

export function WatchRuleFields(): React.ReactElement {
  const [kind, setKind] = useState<Kind>('transitCrossing');
  const chosen = WATCH_KINDS.find((one) => one.id === kind)!;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className={LABEL}>What to watch for</legend>
        <div className="mt-1 grid gap-px bg-[var(--rule)] sm:grid-cols-2">
          {WATCH_KINDS.map((option) => (
            <label
              key={option.id}
              className={`cursor-pointer bg-[var(--surface)] px-3 py-2.5 transition-colors ${
                kind === option.id ? 'ring-2 ring-inset ring-[var(--accent)]' : ''
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={option.id}
                checked={kind === option.id}
                onChange={() => setKind(option.id)}
                className="sr-only"
              />
              <span className="block font-display text-[1.05rem] leading-tight">
                {option.label}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--ink-faint)]">
                {option.blurb}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        {kind !== 'dashaChange' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="transiting" className={LABEL}>
              Which graha
            </label>
            <select id="transiting" name="transiting" required className={FIELD}>
              {TRANSITING_BODIES.filter(
                /* The luminaries and the nodes never station, so offering
                   them under that kind would offer a rule that cannot fire. */
                (body) => kind !== 'station' || !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(body),
              ).map((body) => (
                <option key={body} value={body}>
                  {body}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === 'transitCrossing' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="natalPoint" className={LABEL}>
              Reaches natal
            </label>
            <select id="natalPoint" name="natalPoint" required className={FIELD}>
              {NATAL_POINTS.map((point) => (
                <option key={point} value={point}>
                  {point}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === 'ingress' ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="intoSign" className={LABEL}>
                Into a sign
              </label>
              <select id="intoSign" name="intoSign" defaultValue="any" className={FIELD}>
                <option value="any">Any sign</option>
                {SIGNS.map((sign, index) => (
                  <option key={sign} value={String(index)}>
                    {sign}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="intoHouse" className={LABEL}>
                …or into a house
              </label>
              <select id="intoHouse" name="intoHouse" defaultValue="any" className={FIELD}>
                <option value="any">Any house</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => (
                  <option key={house} value={String(house)}>
                    The {house}th
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {kind === 'station' ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="direction" className={LABEL}>
                Which way
              </label>
              <select id="direction" name="direction" defaultValue="" className={FIELD}>
                <option value="">Either</option>
                <option value="retrograde">Turns retrograde</option>
                <option value="direct">Turns direct</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="inHouse" className={LABEL}>
                In a house
              </label>
              <select id="inHouse" name="inHouse" defaultValue="any" className={FIELD}>
                <option value="any">Anywhere</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => (
                  <option key={house} value={String(house)}>
                    The {house}th
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {kind === 'dashaChange' ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="level" className={LABEL}>
                Which level
              </label>
              <select id="level" name="level" defaultValue="2" className={FIELD}>
                {DASHA_LEVELS.map((one) => (
                  <option key={one.level} value={String(one.level)}>
                    {one.label} — {one.blurb}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lord" className={LABEL}>
                Whose period
              </label>
              <select id="lord" name="lord" defaultValue="" className={FIELD}>
                <option value="">Any lord</option>
                {DASHA_LORDS.map((lord) => (
                  <option key={lord} value={lord}>
                    {lord}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>

      <p className="max-w-[58ch] text-[12.5px] leading-relaxed text-[var(--ink-faint)]">
        {chosen.blurb}
      </p>
    </div>
  );
}
