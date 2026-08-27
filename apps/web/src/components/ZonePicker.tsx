'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The practice's time zone.
 *
 * The list is rendered from a server-supplied array so the field works with
 * JavaScript disabled and does not flash empty on hydration. The one thing
 * that genuinely needs the client is detection — a server cannot know what
 * zone a reader is sitting in, and asking someone to find "Pacific/Honolulu"
 * in a four-hundred item list when their browser already knows is a small
 * cruelty.
 *
 * The detected zone is offered, never applied. A practitioner travelling, or
 * one working to a teacher's clock, has a legitimate reason for these to
 * differ, and silently overwriting the stored value on every page load would
 * make that impossible to express.
 *
 * The select is deliberately **uncontrolled**. Every other field on the
 * settings form uses `defaultValue`, and a lone controlled input in the middle
 * of them behaves differently in ways that are easy to miss: React reasserts
 * its own state on every render, so a value set by anything other than React —
 * a password manager, an extension, a test — is silently discarded, and the
 * form posts something other than what is on screen. A ref plus `defaultValue`
 * keeps this an ordinary form control that happens to have a convenience
 * button attached.
 */
export function ZonePicker({
  zones,
  value,
}: {
  zones: readonly string[];
  /** The stored zone, or empty when nobody has chosen one. */
  value: string;
}): React.ReactElement {
  const select = useRef<HTMLSelectElement>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone) setDetected(zone);
    } catch {
      // A browser that will not report its zone is not an error worth showing.
    }
  }, []);

  // The stored zone may not be in the runtime's list — an older tzdb, or a
  // zone renamed since. Keeping it as an option means saving the form does not
  // quietly change it to whatever happened to be first.
  const options = !value || zones.includes(value) ? zones : [value, ...zones];
  const offerDetected = detected && detected !== current;

  return (
    <div className="flex flex-col gap-2">
      <select
        id="homeZoneId"
        name="homeZoneId"
        ref={select}
        defaultValue={value}
        onChange={(event) => setCurrent(event.target.value)}
        className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <option value="">Not set — dates shown in UTC</option>
        {options.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      {offerDetected ? (
        <button
          type="button"
          onClick={() => {
            if (select.current) {
              select.current.value = detected;
              setCurrent(detected);
            }
          }}
          className="self-start font-mono text-[11px] text-[var(--accent)] underline underline-offset-2"
        >
          use this device&rsquo;s zone — {detected.replace(/_/g, ' ')}
        </button>
      ) : null}
    </div>
  );
}
