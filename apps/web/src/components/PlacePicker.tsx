'use client';

import { useEffect, useRef, useState } from 'react';

export interface PlaceOption {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezoneId: string;
}

/**
 * Birthplace input.
 *
 * Search picks the coordinates and the time zone together, because a place
 * name alone is not enough to cast a chart — and the manual escape hatch is
 * always visible, because no atlas contains every village.
 *
 * ## What was wrong with the first version
 *
 * All of it was reasonable and the whole thing was hard to use, which is worth
 * recording because none of the causes were visible from the code:
 *
 *  - **The atlas held twenty-one cities.** `places:import` was in
 *    `package.json` and the script it named did not exist. Everything below
 *    is downstream of that; a search box over twenty-one rows cannot be made
 *    to feel good.
 *  - **No feedback.** With no results the list simply did not appear, so
 *    "still typing", "nothing found" and "the request failed" were the same
 *    screen. Now each says which it is, and the empty case offers the way out
 *    rather than leaving you to find it.
 *  - **Mouse only.** Typing a city then reaching for the mouse to click the
 *    first result is a gear change in the middle of a form. Arrow keys and
 *    Enter now work.
 *  - **The manual form asked for an IANA zone identifier from memory.**
 *    Nobody knows `Pacific/Honolulu`. It is derived from the coordinates now,
 *    shown before saving, and still overridable.
 *  - **Placeholders instead of labels.** They vanish the moment you type, so
 *    the four boxes become four anonymous numbers precisely when you are
 *    checking your work.
 */
export function PlacePicker({
  initial,
}: {
  /**
   * The place already on record, when correcting an existing person.
   *
   * Starting the field empty on an edit form is how birth data gets lost:
   * everything else is pre-filled, so a blank birthplace reads as optional
   * rather than as "re-enter this or lose it". Seeded here, the picker opens
   * in its chosen state with a `change` button, exactly as it looks after a
   * fresh search.
   */
  initial?: PlaceOption | null;
} = {}): React.ReactElement {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [status, setStatus] = useState<'idle' | 'searching' | 'done' | 'failed'>('idle');
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState<PlaceOption | null>(initial ?? null);
  const [manual, setManual] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (chosen || manual || query.trim().length < 2) {
      setOptions([]);
      setStatus('idle');
      return;
    }
    setStatus('searching');
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void fetch(`/api/places?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
        .then((results: PlaceOption[]) => {
          setOptions(results);
          setActive(0);
          setStatus('done');
        })
        .catch(() => {
          setOptions([]);
          setStatus('failed');
        });
    }, 180);
    return () => clearTimeout(debounce.current);
  }, [query, chosen, manual]);

  /**
   * Arrow keys move, Enter chooses, Escape clears.
   *
   * Enter is explicitly prevented from submitting the form while the list is
   * open. Without that, pressing Enter on a highlighted city submits a person
   * with no birthplace — which is the single worst outcome this component can
   * produce, because the form looks like it worked.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (options.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[active];
      if (option) setChosen(option);
    } else if (event.key === 'Escape') {
      setOptions([]);
      setStatus('idle');
    }
  };

  const nothingFound = status === 'done' && options.length === 0 && query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="place-search">
        Birthplace
      </label>

      {chosen ? (
        <div className="flex items-center justify-between gap-3 border border-[var(--rule)] bg-[var(--surface)] px-3 py-2">
          <span>
            <span className="font-medium">{chosen.label}</span>
            <span className="ml-2 font-mono text-[11px] text-[var(--ink-muted)]">
              {chosen.latitude.toFixed(4)}, {chosen.longitude.toFixed(4)} · {chosen.timezoneId}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setChosen(null);
              setQuery('');
              setManual(false);
            }}
            className="shrink-0 font-mono text-[11px] underline"
          >
            change
          </button>
        </div>
      ) : (
        <>
          {!manual ? (
            <>
              <input
                id="place-search"
                autoComplete="off"
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls="place-options"
                aria-autocomplete="list"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="City — try “Ann Arbor MI” or “Springfield, Illinois”"
                className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base"
              />
              <p className="font-mono text-[10.5px] text-[var(--ink-faint)]">
                Every US town, and cities worldwide over 15,000. Add a state or country to narrow it
                — ↑↓ to move, Enter to choose.
              </p>

              {options.length > 0 ? (
                <ul
                  id="place-options"
                  role="listbox"
                  className="border border-[var(--rule)] bg-[var(--surface)]"
                >
                  {options.map((option, index) => (
                    <li key={option.id} role="option" aria-selected={index === active}>
                      <button
                        type="button"
                        onClick={() => setChosen(option)}
                        onMouseEnter={() => setActive(index)}
                        className={`flex w-full flex-col items-start px-3 py-2 text-left ${
                          index === active ? 'bg-[var(--accent-wash)]' : ''
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                          {option.timezoneId} · {option.latitude.toFixed(3)},{' '}
                          {option.longitude.toFixed(3)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/*
                The three failure states said apart. Before, all three looked
                identical — an absent list — and the reader had to guess which
                one they were in.
              */}
              {status === 'searching' && query.trim().length >= 2 ? (
                <p className="font-mono text-[11px] text-[var(--ink-faint)]">Searching…</p>
              ) : null}
              {status === 'failed' ? (
                <p className="font-mono text-[11px] text-[var(--clay)]">
                  The search did not answer. Try again, or enter the coordinates below.
                </p>
              ) : null}
              {nothingFound ? (
                <p className="border-l-2 border-[var(--clay)] py-1 pl-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                  Nothing matched “{query}”. Try just the town name, or a nearby larger one — a few
                  miles will not move the chart. Or{' '}
                  <button
                    type="button"
                    onClick={() => setManual(true)}
                    className="underline underline-offset-2"
                  >
                    enter the coordinates
                  </button>
                  .
                </p>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setManual((value) => !value)}
            className="self-start font-mono text-[11px] text-[var(--ink-muted)] underline"
          >
            {manual ? '← back to search' : 'not listed — enter coordinates'}
          </button>
        </>
      )}

      {manual && !chosen ? <ManualPlace /> : null}

      {chosen ? (
        <>
          <input type="hidden" name="placeName" value={chosen.label} />
          <input type="hidden" name="latitude" value={chosen.latitude} />
          <input type="hidden" name="longitude" value={chosen.longitude} />
          <input type="hidden" name="timezoneId" value={chosen.timezoneId} />
        </>
      ) : null}
    </div>
  );
}

/**
 * The escape hatch, for places the atlas does not hold.
 *
 * The zone is derived from the coordinates rather than typed. That is the
 * whole change: it turns "name the IANA zone for a village in Kerala" — which
 * almost nobody can do — into "read two numbers off a map", which almost
 * everybody can. The derived zone is displayed before anything is saved and
 * can be overridden, because a setting this consequential must never be
 * silently decided (constitution #3).
 */
function ManualPlace(): React.ReactElement {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [zone, setZone] = useState('');
  const [zoneNote, setZoneNote] = useState<string | null>(null);
  const [touchedZone, setTouchedZone] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (
      touchedZone ||
      latitude.trim() === '' ||
      longitude.trim() === '' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void fetch(`/api/timezone?lat=${lat}&lon=${lon}`)
        .then((response) => response.json())
        .then((body: { timezoneId?: string; error?: string }) => {
          if (body.timezoneId) {
            setZone(body.timezoneId);
            setZoneNote(`Resolved from the coordinates. Change it if you know better.`);
          } else {
            setZoneNote(body.error ?? 'Could not resolve a zone for that point.');
          }
        })
        .catch(() => setZoneNote('Could not reach the zone lookup. Enter one by hand.'));
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [latitude, longitude, touchedZone]);

  const field = 'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2';
  const labelClass = 'font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-faint)]';

  return (
    <div className="flex flex-col gap-3 border-l-2 border-[var(--rule-strong)] pl-3">
      <p className="text-[13px] leading-relaxed text-[var(--ink-muted)]">
        Give the coordinates and Jade works out the time zone. Decimal degrees — south and west are
        negative.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Labels above the fields, not inside them. A placeholder disappears
            the moment you type, which is exactly when you want to check that
            the number you just entered went in the right box. */}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Latitude</span>
          <input
            name="latitude"
            inputMode="decimal"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="21.3069"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Longitude</span>
          <input
            name="longitude"
            inputMode="decimal"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="-157.8583"
            className={field}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Time zone</span>
        <input
          name="timezoneId"
          value={zone}
          onChange={(event) => {
            setZone(event.target.value);
            setTouchedZone(true);
          }}
          placeholder="Filled in from the coordinates"
          className={field}
        />
        {zoneNote ? (
          <span className="font-mono text-[10.5px] text-[var(--ink-faint)]">{zoneNote}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Place name</span>
        <input name="placeName" placeholder="What to call it on the chart" className={field} />
      </label>
    </div>
  );
}
