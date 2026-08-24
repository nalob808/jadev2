export interface FaqItem {
  readonly q: string;
  readonly a: string;
}

/**
 * The questions this audience actually asks.
 *
 * Written to be true rather than reassuring: an astrologer evaluating software
 * checks the ayanāṁśa handling and the node type before anything else, and a
 * page that dodges those reads as marketing. These double as the FAQPage
 * structured data, which is how they can appear directly in a search result.
 */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    q: 'Which ayanāṁśa does Jade use?',
    a: 'Lahiri (Chitrapakṣa) by default, with True Citrā, Raman, Krishnamurti, Yukteshwar, Fagan–Bradley, Sūrya Siddhānta and a custom value all selectable. Whichever you choose is stored with the chart and shown in the interface, so a chart can always say which frame produced it.',
  },
  {
    q: 'Mean nodes or true nodes?',
    a: 'Your choice, set explicitly and persisted with the chart. Mean is the default because most Vedic software uses it. Position basis is separate and also explicit: apparent positions by default, or true geometric positions, which is what Jagannātha Hora computes — the two differ by up to 55 arcseconds.',
  },
  {
    q: 'Is this accurate enough for professional work?',
    a: 'Positions are verified against Swiss Ephemeris fixtures in continuous integration. Derived techniques are diffed against an independent implementation across seventeen charts, and where they disagree the disagreement is documented rather than hidden. Aṣṭakūṭa is verified against all 11,664 possible nakṣatra-pāda pairings.',
  },
  {
    q: 'Which chart styles are supported?',
    a: 'North Indian and South Indian, drawn as real SVG so they stay sharp at any size and print correctly. The East Indian (Bengali) layout is deliberately not shipped: it renders correctly as geometry but the traditional sign arrangement could not be verified against a reference, and a plausible guess at a regional convention is worse than an honest absence.',
  },
  {
    q: 'Does Jade tell me whether a match is good?',
    a: 'No. Aṣṭakūṭa scores are shown as eight components with the rules that produced each one, never as a headline compatibility percentage. Maṅgala doṣa is reported together with its classical cancellations. Nothing in Jade returns a verdict, and nothing predicts death, disease or legal outcomes.',
  },
  {
    q: 'What does the free tier include?',
    a: 'Three people, the rāśi and navāṁśa charts, and today’s transits — enough to cast your own chart properly and decide whether the rest is worth paying for. No card, and no trial that expires.',
  },
  {
    q: 'Can I get my data out?',
    a: 'Every person exports as JSON from their own page, and hard delete is a separate, explicit action rather than a soft flag. Birth data is never sent to a third-party model.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'Yes. The charts are responsive SVG and the interface is built for a phone as well as a desk — the common case of checking a transit between sessions should not require a laptop.',
  },
];

/**
 * Rendered with `<details>` rather than a JavaScript accordion.
 *
 * It works before hydration, it is keyboard accessible for free, and browser
 * find-in-page can open a closed answer — none of which is true of a div that
 * toggles a class.
 */
export function FAQ({ items }: { items: readonly FaqItem[] }): React.ReactElement {
  return (
    <div className="mt-8 border-t border-[var(--rule)]">
      {items.map((item, index) => (
        <details
          key={item.q}
          className="jade-rise group border-b border-[var(--rule)]"
          style={{ '--i': index } as React.CSSProperties}
        >
          <summary className="flex cursor-pointer list-none items-baseline gap-3 py-4 font-display text-xl leading-snug transition-colors hover:text-[var(--accent)] [&::-webkit-details-marker]:hidden">
            <span className="grow">{item.q}</span>
            <span
              aria-hidden="true"
              className="shrink-0 font-mono text-sm text-[var(--ink-faint)] transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pb-5 pr-8 text-[15px] leading-relaxed text-[var(--ink-muted)]">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
