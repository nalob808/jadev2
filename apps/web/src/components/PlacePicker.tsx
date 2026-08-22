'use client';

import { useEffect, useRef, useState } from 'react';

interface PlaceOption {
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
 * always visible, because the atlas will never contain every village.
 */
export function PlacePicker(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [chosen, setChosen] = useState<PlaceOption | null>(null);
  const [manual, setManual] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (chosen || manual || query.trim().length < 2) {
      setOptions([]);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void fetch(`/api/places?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : []))
        .then((results: PlaceOption[]) => setOptions(results))
        .catch(() => setOptions([]));
    }, 180);
    return () => clearTimeout(debounce.current);
  }, [query, chosen, manual]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="place-search">
        Birthplace
      </label>

      {chosen ? (
        <div className="flex items-center justify-between border border-[var(--rule)] bg-[var(--surface)] px-3 py-2">
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
            }}
            className="font-mono text-[11px] underline"
          >
            change
          </button>
        </div>
      ) : (
        <>
          <input
            id="place-search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing a city…"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base"
          />
          {options.length > 0 ? (
            <ul className="border border-[var(--rule)] bg-[var(--surface)]">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => setChosen(option)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[var(--paper)]"
                  >
                    <span>{option.label}</span>
                    <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                      {option.timezoneId}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => setManual((value) => !value)}
            className="self-start font-mono text-[11px] text-[var(--ink-muted)] underline"
          >
            {manual ? 'search instead' : 'not listed — enter coordinates'}
          </button>
        </>
      )}

      {manual && !chosen ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            name="latitude"
            placeholder="Latitude (21.3069)"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2"
          />
          <input
            name="longitude"
            placeholder="Longitude (-157.8583)"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2"
          />
          <input
            name="timezoneId"
            placeholder="Pacific/Honolulu"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2"
          />
          <input
            name="placeName"
            placeholder="Place name"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 sm:col-span-3"
          />
        </div>
      ) : null}

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
