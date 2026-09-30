'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MAX_RINGS, addLayer, parseStack, serialiseStack } from '@/lib/chartStack';

/**
 * Adding a ring.
 *
 * One menu for the three things that can go on the wheel — one of your people,
 * a chart from the library, or the sky — because they are the same kind of
 * thing and hunting for them in three different places was the old wheel's
 * worst habit.
 *
 * A full stack disables the controls and says why rather than quietly dropping
 * the outermost ring. Somebody who spent a minute choosing a second chart
 * should not lose it to a click they did not think was destructive.
 */

export interface MenuPerson {
  readonly id: string;
  readonly name: string;
  readonly born: string;
}

export interface MenuFigure {
  readonly slug: string;
  readonly name: string;
  readonly born: string;
  readonly rodden: string;
}

export function ChartMenu({
  people,
  figures,
  stack,
  transitsOn,
}: {
  readonly people: readonly MenuPerson[];
  readonly figures: readonly MenuFigure[];
  /** The resolved stack, serialised — see ChartStackPanels for why it is a prop. */
  readonly stack: string;
  readonly transitsOn: boolean;
}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState<'person' | 'figure' | null>(null);

  const layers = parseStack(stack);
  /* The sky takes a ring too, so a full chart stack plus transits is the cap. */
  const rings = layers.length + (transitsOn ? 1 : 0);
  const full = rings >= MAX_RINGS;

  const push = (query: URLSearchParams): void => {
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
    setOpen(null);
  };

  const add = (layer: Parameters<typeof addLayer>[1]): void => {
    const next = addLayer(layers, layer);
    if (next.length === layers.length) return;
    const query = new URLSearchParams(params.toString());
    query.set('stack', serialiseStack(next));
    push(query);
  };

  const addSky = (): void => {
    const query = new URLSearchParams(params.toString());
    query.set('t', '0');
    push(query);
  };

  const control =
    'w-full border border-[var(--rule)] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider transition-colors';
  const enabled = `${control} text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]`;
  const disabled = `${control} cursor-not-allowed text-[var(--ink-faint)] opacity-50`;

  /* What is already on the wheel, so the lists do not offer it twice. */
  const chosen = new Set(
    layers.flatMap((layer) =>
      layer.kind === 'person' ? [layer.id] : layer.kind === 'figure' ? [layer.slug] : [],
    ),
  );

  return (
    <section className="jade-panel p-4">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--accent)]">
        Chart menu
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-[var(--ink-faint)]">
        {rings} of {MAX_RINGS} rings
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          disabled={full}
          onClick={() => setOpen(open === 'person' ? null : 'person')}
          aria-expanded={open === 'person'}
          className={full ? disabled : enabled}
        >
          + Someone in your book
        </button>
        {open === 'person' ? (
          <ul className="mb-1 max-h-56 overflow-y-auto border border-[var(--rule)]">
            {people
              .filter((person) => !chosen.has(person.id))
              .map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => add({ kind: 'person', id: person.id })}
                    className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--surface-alt)]"
                  >
                    {person.name}
                    <span className="ml-2 font-mono text-[10px] text-[var(--ink-faint)]">
                      {person.born}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        ) : null}

        <button
          type="button"
          disabled={full}
          onClick={() => setOpen(open === 'figure' ? null : 'figure')}
          aria-expanded={open === 'figure'}
          className={full ? disabled : enabled}
        >
          + A chart from the library
        </button>
        {open === 'figure' ? (
          <ul className="mb-1 max-h-56 overflow-y-auto border border-[var(--rule)]">
            {figures
              .filter((figure) => !chosen.has(figure.slug))
              .map((figure) => (
                <li key={figure.slug}>
                  <button
                    type="button"
                    onClick={() => add({ kind: 'figure', slug: figure.slug })}
                    className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--surface-alt)]"
                  >
                    {figure.name}
                    <span className="ml-2 font-mono text-[10px] text-[var(--ink-faint)]">
                      {figure.born} · {figure.rodden}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        ) : null}

        <button
          type="button"
          disabled={full || transitsOn}
          onClick={addSky}
          className={full || transitsOn ? disabled : enabled}
        >
          {transitsOn ? '✓ The sky is on the wheel' : '+ The sky, as transits'}
        </button>
      </div>

      {full ? (
        <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-[var(--ink-faint)]">
          Three rings is the limit. A fourth puts nine more glyphs on a circle that already carries
          twenty-seven. Remove one to add another.
        </p>
      ) : null}
    </section>
  );
}
