import {
  lordOfSign,
  taraBala,
  type AshtakutaResult,
  type ComputedChart,
  type Graha,
  type MangalaComparison,
  type SynastryResult,
} from '@jade/astro';
import { houseSignification } from './significations/houses.js';
import { grahaSignification } from './significations/grahas.js';
import { signSignification } from './significations/signs.js';
import { permitted, type GroundedStatement, type ReadingSection } from './reading.js';

/**
 * Two charts, read against each other.
 *
 * Compatibility is where astrology software is at its worst. The standard
 * output is a percentage — 28 out of 36, a green bar, a verdict — and it is
 * worthless for three separate reasons. It compresses eight unrelated
 * measurements into one number, so a pair can score badly on the thing that
 * matters and well overall. It reports a technique that reads the Moon's
 * nakṣatra and nothing else as though it had read two whole charts. And it
 * answers a question nobody actually brought: people do not want a score, they
 * want to understand what they are dealing with.
 *
 * So this composes prose instead, and the prose obeys the same rule as every
 * other reading in Jade — a statement appears only with the placements that
 * produced it, shown beside it. Jade returns no compatibility score and no
 * verdict, and the landing page says so in as many words. This module is where
 * that promise is either kept or broken.
 *
 * What it reads, in the order a practitioner does:
 *
 *  1. **Moon to Moon**, both directions. Tārā bala counted each way is a real
 *     asymmetry and one of the more useful things in the whole technique: how
 *     A's Moon stands to B's is not how B's stands to A's.
 *  2. **The lagna axis** — where each ascendant lord falls in the other chart.
 *  3. **The seventh house**, whose grahas land in whose.
 *  4. **Kendras and trikoṇas**, which is where an overlay is loudest.
 *  5. **Conjunctions**, the plainest contact there is.
 *  6. **What aṣṭakūṭa actually measured**, said plainly, because the number is
 *     going to be on screen and somebody has to explain what it is not.
 */

const ORDINALS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
];

/** The angular houses. An overlay here is felt structurally rather than mildly. */
const KENDRAS = [1, 4, 7, 10];
/** The trine houses — the supportive ones in every classical account. */
const TRIKONAS = [1, 5, 9];

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

function list(items: readonly string[], limit = 3): string {
  const shown = items.slice(0, limit);
  if (shown.length <= 1) return shown[0] ?? '';
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

export interface SynastryInput {
  readonly chartA: ComputedChart;
  readonly chartB: ComputedChart;
  readonly nameA: string;
  readonly nameB: string;
  readonly overlays: SynastryResult;
  readonly kutas: AshtakutaResult;
  readonly mangala: MangalaComparison;
}

/**
 * The opening note, printed above everything.
 *
 * Not a disclaimer bolted on at the end. A reader arriving at a compatibility
 * page has expectations built by every other tool they have used, and the
 * first paragraph is the only chance to reset them.
 */
export const SYNASTRY_PREAMBLE =
  'There is no compatibility score on this page and no verdict at the end of it. What follows is a description of how two charts sit against each other — which graha falls in which house, which glance reaches which point — with the placement shown beside every sentence. Aṣṭakūṭa appears further down because a practitioner will look for it, but its number is a reading of two Moons and nothing else, and it is presented as that rather than as a result.';

export function synastryReadingFor(input: SynastryInput): ReadingSection[] {
  const { chartA, chartB, nameA, nameB, overlays, kutas, mangala } = input;
  const sections: ReadingSection[] = [];

  const moonA = chartA.points.Moon;
  const moonB = chartB.points.Moon;

  // ------------------------------------------------------------- Moon to Moon
  if (moonA && moonB) {
    const aFromB = taraBala(moonB.longitude, moonA.longitude);
    const bFromA = taraBala(moonA.longitude, moonB.longitude);
    const signA = signSignification(moonA.signIndex);
    const signB = signSignification(moonB.signIndex);

    const statements: GroundedStatement[] = [
      {
        text: `${nameA}'s Moon is at ${degrees(moonA.degreesInSign)} ${moonA.sign} in ${moonA.nakshatra.name}; ${nameB}'s at ${degrees(moonB.degreesInSign)} ${moonB.sign} in ${moonB.nakshatra.name}. The Moon is the mind in Jyotiṣa — not what a person thinks but how they take things in — which is why every relationship technique in the tradition starts here rather than with the Sun.`,
        factors: [
          {
            kind: nameA,
            detail: `Moon ${degrees(moonA.degreesInSign)} ${moonA.sign} · ${moonA.nakshatra.name} pāda ${moonA.nakshatra.pada}`,
          },
          {
            kind: nameB,
            detail: `Moon ${degrees(moonB.degreesInSign)} ${moonB.sign} · ${moonB.nakshatra.name} pāda ${moonB.nakshatra.pada}`,
          },
        ],
        anchor: { kind: 'graha', key: 'Moon', label: 'Moon' },
      },
      {
        // The asymmetry is the interesting part and most software throws it
        // away by averaging the two counts into one score.
        text: `Counted from ${nameB}'s birth star, ${nameA}'s Moon falls in the ${aFromB.index}${suffix(aFromB.index)} tārā — ${aFromB.name}. Counted the other way, ${nameB}'s Moon falls in the ${bFromA.index}${suffix(bFromA.index)} from ${nameA}'s — ${bFromA.name}. ${aFromB.name === bFromA.name ? 'The two counts happen to agree here, which is uncommon and worth noticing.' : 'These do not have to match, and usually do not. The count is directional: how one person receives the other is a different measurement from how they are received.'}`,
        factors: [
          { kind: `${nameA} from ${nameB}`, detail: `${aFromB.name} — tārā ${aFromB.index} of 9` },
          { kind: `${nameB} from ${nameA}`, detail: `${bFromA.name} — tārā ${bFromA.index} of 9` },
        ],
        source: 'Muhūrta Cintāmaṇi',
        anchor: { kind: 'nakshatra', key: moonA.nakshatra.name, label: moonA.nakshatra.name },
      },
    ];

    if (signA && signB) {
      const sameElement = signA.element === signB.element;
      const sameModality = signA.modality === signB.modality;
      statements.push({
        text: `By sign, that is ${signA.modality} ${signA.element} against ${signB.modality} ${signB.element}. ${
          sameElement && sameModality
            ? 'Same element and same modality — the two minds are built to the same pattern, which the tradition reads as ease of recognition rather than as an absence of friction.'
            : sameElement
              ? 'The same element, in different modalities: a shared temperament expressed at different speeds.'
              : sameModality
                ? 'Different elements at the same modality — two minds that move at the same rate over different ground.'
                : 'Different on both counts. The classical texts have nothing to say about this being good or bad; it describes two minds that do not arrive at things the same way.'
        }`,
        factors: [
          {
            kind: nameA,
            detail: `${signA.name} — ${signA.modality} ${signA.element}, ruled by ${signA.lord}`,
          },
          {
            kind: nameB,
            detail: `${signB.name} — ${signB.modality} ${signB.element}, ruled by ${signB.lord}`,
          },
        ],
        anchor: { kind: 'sign', key: signA.name, label: signA.name },
      });
    }

    sections.push({
      id: 'synastry-moons',
      kicker: 'Where the tradition starts',
      title: 'The two Moons',
      lede: 'Every classical matching technique reads the Moon before it reads anything else, and most of them read nothing but the Moon.',
      statements: statements.filter(permitted),
    });
  }

  // ------------------------------------------------------------- the lagna axis
  const lordA = lordOfSign(chartA.houses.ascendantSign);
  const lordB = lordOfSign(chartB.houses.ascendantSign);
  const lordAinB = houseOfIn(chartB, chartA.points[lordA]?.signIndex);
  const lordBinA = houseOfIn(chartA, chartB.points[lordB]?.signIndex);
  const axis: GroundedStatement[] = [];

  if (lordAinB && chartA.points[lordA]) {
    const houseLib = houseSignification(lordAinB);
    const grahaLib = grahaSignification(lordA);
    axis.push({
      text: `${nameA}'s chart is ruled by ${lordA}, and in ${nameB}'s chart that graha falls in the ${ORDINALS[lordAinB - 1]} house${houseLib ? ` — ${list(houseLib.keywords)}` : ''}. Where the other person's lagna lord lands is where they are most present in your life${grahaLib ? `, and ${lordA} ${grahaLib.acts} whatever it occupies` : ''}.`,
      factors: [
        {
          kind: `${nameA}'s lagna`,
          detail: `${signName(chartA.houses.ascendantSign)}, ruled by ${lordA}`,
        },
        { kind: 'Falls in', detail: `${nameB}'s ${lordAinB}${suffix(lordAinB)} house` },
      ],
      source: houseLib?.source,
      anchor: { kind: 'graha', key: lordA, label: lordA },
    });
  }

  if (lordBinA && chartB.points[lordB]) {
    const houseLib = houseSignification(lordBinA);
    const grahaLib = grahaSignification(lordB);
    axis.push({
      text: `${nameB}'s chart is ruled by ${lordB}, which falls in ${nameA}'s ${ORDINALS[lordBinA - 1]} house${houseLib ? ` — ${list(houseLib.keywords)}` : ''}${grahaLib ? `. ${lordB.charAt(0)}${lordB.slice(1)} ${grahaLib.acts} what it sits on` : ''}.${lordAinB === lordBinA ? ' Both lagna lords land in the same house of the other chart, which is a genuine symmetry rather than a coincidence of counting.' : ''}`,
      factors: [
        {
          kind: `${nameB}'s lagna`,
          detail: `${signName(chartB.houses.ascendantSign)}, ruled by ${lordB}`,
        },
        { kind: 'Falls in', detail: `${nameA}'s ${lordBinA}${suffix(lordBinA)} house` },
      ],
      source: houseLib?.source,
      anchor: { kind: 'graha', key: lordB, label: lordB },
    });
  }

  // The seventh, read both ways.
  const seventhAinB = overlays.aInB.filter((o) => o.house === 7);
  const seventhBinA = overlays.bInA.filter((o) => o.house === 7);
  if (seventhAinB.length || seventhBinA.length) {
    const seventh = houseSignification(7);
    axis.push({
      text: `In the seventh — the house of the partner, of contracts, of anyone you meet as an equal — ${
        seventhAinB.length
          ? `${nameB}'s chart holds ${nameA}'s ${list(
              seventhAinB.map((o) => o.graha),
              4,
            )}`
          : `${nameB}'s chart holds nothing of ${nameA}'s`
      }, and ${
        seventhBinA.length
          ? `${nameA}'s holds ${nameB}'s ${list(
              seventhBinA.map((o) => o.graha),
              4,
            )}`
          : `${nameA}'s holds nothing of ${nameB}'s`
      }. A graha in the other's seventh is the most direct statement synastry makes: it describes what each person meets in the other by default, before anything is negotiated.`,
      factors: [
        ...seventhAinB.map((o) => ({
          kind: `${nameA} → ${nameB} 7th`,
          detail: `${o.graha} in ${o.sign}`,
        })),
        ...seventhBinA.map((o) => ({
          kind: `${nameB} → ${nameA} 7th`,
          detail: `${o.graha} in ${o.sign}`,
        })),
        ...(seventhAinB.length === 0 && seventhBinA.length === 0
          ? [{ kind: 'Seventh house', detail: 'empty both ways — read the lord instead' }]
          : []),
      ],
      source: seventh?.source,
      anchor: { kind: 'house', key: '7', label: 'Seventh house' },
    });
  }

  if (axis.length) {
    sections.push({
      id: 'synastry-axis',
      kicker: 'The structural contacts',
      title: 'Lagna lords and the seventh',
      lede: 'Where each chart’s ruler falls in the other, and what sits in the house the tradition assigns to partnership.',
      statements: axis.filter(permitted),
    });
  }

  // ------------------------------------------------------- the loudest overlays
  const loud: GroundedStatement[] = [];
  for (const [overlaySet, from, to] of [
    [overlays.aInB, nameA, nameB],
    [overlays.bInA, nameB, nameA],
  ] as const) {
    const angular = overlaySet.filter((o) => KENDRAS.includes(o.house));
    const trine = overlaySet.filter((o) => TRIKONAS.includes(o.house) && o.house !== 1);
    if (!angular.length && !trine.length) continue;

    loud.push({
      text: `${from}'s grahas land on the structural houses of ${to}'s chart in a particular pattern. ${
        angular.length
          ? `In the kendras — the first, fourth, seventh and tenth, the four houses everything else hangs from — sit ${list(
              angular.map((o) => `${o.graha} in the ${ORDINALS[o.house - 1]}`),
              4,
            )}.`
          : 'Nothing falls in the kendras.'
      } ${
        trine.length
          ? `In the trikoṇas, the fifth and ninth, sit ${list(
              trine.map((o) => `${o.graha} in the ${ORDINALS[o.house - 1]}`),
              3,
            )}.`
          : 'The trikoṇas are untouched.'
      } An overlay in an angle is felt structurally rather than occasionally — it describes a house the other person is simply standing in.`,
      factors: [
        ...angular.map((o) => ({
          kind: `Kendra ${o.house}`,
          detail: `${from}'s ${o.graha} — ${o.matters}`,
        })),
        ...trine.map((o) => ({
          kind: `Trikoṇa ${o.house}`,
          detail: `${from}'s ${o.graha} — ${o.matters}`,
        })),
      ],
      anchor: { kind: 'chart', key: 'chart', label: `${from} in ${to}'s houses` },
    });
  }

  if (overlays.conjunctions.length) {
    loud.push({
      text: `${overlays.conjunctions.length === 1 ? 'One graha shares' : `${overlays.conjunctions.length} pairs of grahas share`} a sign across the two charts: ${list(
        overlays.conjunctions.map((c) => `${nameA}'s ${c.a} with ${nameB}'s ${c.b} in ${c.sign}`),
        4,
      )}. A shared sign is the plainest contact in the technique and needs no orb argument to defend — both grahas are simply in the same thirty degrees, and whatever that sign governs is territory the two of them occupy together.`,
      factors: overlays.conjunctions.slice(0, 6).map((c) => ({
        kind: c.sign,
        detail: `${nameA}'s ${c.a} · ${nameB}'s ${c.b}`,
      })),
      anchor: { kind: 'chart', key: 'chart', label: 'Shared signs' },
    });
  }

  const strongGlances = [...overlays.aOnB, ...overlays.bOnA].filter((d) => d.aspectHouse !== 7);
  if (strongGlances.length) {
    loud.push({
      text: `Beyond the mutual seventh glance every graha casts, ${list(
        strongGlances
          .slice(0, 4)
          .map((d) => `${d.from} looks to the ${d.aspectHouse}${suffix(d.aspectHouse)} at ${d.to}`),
        4,
      )}. Mars, Jupiter and Saturn are the only grahas with sight beyond the opposition — Mars to the fourth and eighth, Jupiter to the fifth and ninth, Saturn to the third and tenth — so these are the special dṛṣṭis rather than the ordinary ones, and they are worth reading before the seventh-house glances that everything has.`,
      factors: strongGlances.slice(0, 6).map((d) => ({
        kind: `${d.from} → ${d.to}`,
        detail: `${d.aspectHouse}${suffix(d.aspectHouse)} house dṛṣṭi`,
      })),
      anchor: { kind: 'chart', key: 'chart', label: 'Cross dṛṣṭi' },
    });
  }

  if (loud.length) {
    sections.push({
      id: 'synastry-overlays',
      kicker: 'What actually lands where',
      title: 'The overlays that carry weight',
      lede: 'Houses counted whole-sign from each ascendant. Not every overlay is worth reading — these are the ones that fall on the houses the rest of a chart is built around.',
      statements: loud.filter(permitted),
    });
  }

  // ------------------------------------------------------ what the number is not
  const nadi = kutas.kutas.find((k) => k.kuta === 'nadi');
  const bhakuta = kutas.kutas.find((k) => k.kuta === 'bhakuta');
  const context: GroundedStatement[] = [
    {
      text: `Aṣṭakūṭa scores ${kutas.total} of ${kutas.maximum}, and that number deserves less weight than it usually gets. Every one of the eight kūṭas is computed from the two Moons' nakṣatras and signs — nothing else in either chart is consulted. It does not know where either Mars is, what daśā anyone is running, or whether the two lagna lords have ever met. It is a screening test from an era of arranged marriage, and it was never meant to be the reading.`,
      factors: kutas.kutas.map((k) => ({
        kind: k.name,
        detail: `${k.score} of ${k.maximum} — ${k.reason}`,
      })),
      source: 'Bṛhat Pārāśara Horā Śāstra',
      anchor: { kind: 'chart', key: 'chart', label: 'Aṣṭakūṭa' },
    },
  ];

  if (nadi || bhakuta) {
    context.push({
      text: `Two of the eight carry most of the total between them and are the usual source of an alarming score. ${
        nadi
          ? `Nāḍī alone is worth ${nadi.maximum} of the ${kutas.maximum} — here it scores ${nadi.score}, because ${lowerFirst(nadi.reason)}. `
          : ''
      }${
        bhakuta
          ? `Bhakūṭa is worth ${bhakuta.maximum} and scores ${bhakuta.score}: ${lowerFirst(bhakuta.reason)}. `
          : ''
      }A pair can lose a third of the available points on these two while every structural contact between the charts is sound, which is exactly why the components are printed here rather than the total alone.`,
      factors: [
        ...(nadi
          ? [{ kind: 'Nāḍī', detail: `${nadi.score} of ${nadi.maximum} — ${nadi.reason}` }]
          : []),
        ...(bhakuta
          ? [
              {
                kind: 'Bhakūṭa',
                detail: `${bhakuta.score} of ${bhakuta.maximum} — ${bhakuta.reason}`,
              },
            ]
          : []),
      ],
      anchor: { kind: 'chart', key: 'chart', label: 'Aṣṭakūṭa' },
    });
  }

  const mangalaNote = mangala.mutuallyCancelled
    ? `Both charts carry maṅgala doṣa, and the oldest and least contested rule in the whole discussion is that when both carry it, it does not weigh between them.`
    : mangala.a.present || mangala.b.present
      ? `Maṅgala doṣa is present in ${mangala.a.present ? nameA : ''}${mangala.a.present && mangala.b.present ? ' and ' : ''}${mangala.b.present ? nameB : ''}'s chart by the references consulted${
          [...mangala.a.cancellations, ...mangala.b.cancellations].length
            ? `, with ${[...mangala.a.cancellations, ...mangala.b.cancellations].length} classical cancellation${[...mangala.a.cancellations, ...mangala.b.cancellations].length === 1 ? '' : 's'} found — which is the half of the doctrine most software omits.`
            : '. No cancelling condition was found among the ones Jade checks, which is a statement about the checks as much as about the charts.'
        }`
      : `Neither chart carries maṅgala doṣa from the reference points consulted — the lagna, the Moon and Venus.`;

  context.push({
    text: `${mangalaNote} Maṅgala doṣa is Mars occupying particular houses from particular reference points, and which references count is genuinely disputed between traditions. Jade shows which ones it used, because a doṣa reported without its reference point cannot be checked or argued with.`,
    factors: [
      ...mangala.a.occurrences.map((o) => ({ kind: nameA, detail: o.description })),
      ...mangala.b.occurrences.map((o) => ({ kind: nameB, detail: o.description })),
      ...(mangala.a.occurrences.length === 0 && mangala.b.occurrences.length === 0
        ? [{ kind: 'References consulted', detail: mangala.a.references.join(', ') }]
        : []),
    ],
    source: 'Bṛhat Pārāśara Horā Śāstra; Muhūrta Cintāmaṇi',
    anchor: { kind: 'graha', key: 'Mars', label: 'Mars' },
  });

  sections.push({
    id: 'synastry-kutas',
    kicker: 'The screening tests',
    title: 'What aṣṭakūṭa and maṅgala doṣa actually measured',
    lede: 'Both of these will be on screen below, so both are worth explaining rather than leaving to be misread as a result.',
    statements: context.filter(permitted),
  });

  return sections;
}

function houseOfIn(chart: ComputedChart, signIndex: number | undefined): number | null {
  if (signIndex == null) return null;
  if (chart.houses.system !== 'whole_sign') return null;
  return ((((signIndex - chart.houses.ascendantSign) % 12) + 12) % 12) + 1;
}

function signName(index: number): string {
  return signSignification(index)?.name ?? `sign ${index + 1}`;
}

function suffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Re-exported for the page, so the two never disagree about what is `Graha`. */
export type { Graha };
