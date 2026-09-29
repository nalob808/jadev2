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
    a: 'Lahiri (Chitrapakṣa), or a custom offset if you work from your own value. Six more are named in the settings and disabled until their coefficients have been fitted against Swiss Ephemeris. Jade would rather show you that it knows what Krishnamurti is and has not verified it yet than quietly cast your chart in Lahiri and call it KP. Whichever you use is stored with the chart and printed in the interface.',
  },
  {
    q: 'Mean nodes or true nodes?',
    a: 'Your choice, set explicitly and persisted with the chart. Mean is the default because most Vedic software uses it. Position basis is separate and also explicit: apparent positions by default, or true geometric positions, which is what Jagannātha Hora computes. The two differ by up to 55 arcseconds.',
  },
  {
    q: 'Is this accurate enough for professional work?',
    a: 'Positions are verified against Swiss Ephemeris fixtures in continuous integration. Derived techniques are diffed against an independent implementation across seventeen charts, and where they disagree the disagreement is published. Aṣṭakūṭa is verified against all 11,664 possible nakṣatra-pāda pairings.',
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
    q: 'Do I need the vocabulary to use it?',
    a: 'No. Every chart has a plain-English reading at read.jadeapp.co: each house with its sign, its lord, what sits in it and what aspects it, written in ordinary words, with the placements behind every paragraph one tap away. The technical sheet is always there when you want it. Nothing in the reading is generated prose with no arithmetic behind it.',
  },
  {
    q: 'Is the 3D sky view a gimmick?',
    a: 'It earns its place on two counts. It shows ecliptic latitude, which a flat wheel has nowhere to put, and which classical graha-yuddha and Rohiṇī-śakaṭa-bheda rules both turn on. And it draws a retrograde loop as an actual loop rather than a backwards arc. The stars are the Yale catalogue, 5,080 of them, so Spica sits at 179.984° under Lahiri and you can check the sphere against the sky.',
  },
  {
    q: 'What does the free tier include?',
    a: 'Three people, the rāśi and navāṁśa charts, and today’s transits. That is enough to cast your own chart properly and decide whether the rest is worth paying for. No card, and no trial that expires.',
  },
  {
    q: 'Can I get my data out?',
    a: 'Every person exports as JSON from their own page, and hard delete is a separate, explicit action and not a soft flag. Birth data is never sent to a third-party model.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'Yes. The charts are responsive SVG and the interface is built for a phone as well as a desk. Checking a transit between sessions should not need a laptop.',
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
