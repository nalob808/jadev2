import {
  SIGNS,
  dayQuality,
  type ComputedChart,
  type DashaPeriod,
  type DayBand,
  type DayQuality,
  type Panchanga,
  type SkyPosition,
} from '@jade/astro';
import { houseSignification } from './significations/houses.js';
import { grahaSignification } from './significations/grahas.js';
import type { GroundedStatement, ReadingSection } from './reading.js';
import { permitted } from './reading.js';

/**
 * What today is, for one person.
 *
 * This is the section of the app under the most pressure to become a
 * horoscope, so the rules it works under are worth stating plainly.
 *
 * A daily reading here is never about the future and never about outcomes. It
 * is a description of where the sky is *relative to this chart* — which natal
 * house each transiting graha is crossing, how the Moon stands to the natal
 * Moon by the two classical counts, and whether the day's nakṣatra lord has
 * anything to do with the daśā currently running. Every one of those is a
 * position, checkable against the chart, and every sentence carries the
 * positions that produced it.
 *
 * The tārā and candra counts are the only place Jade assigns favourability at
 * all, and it does so by quoting rather than by judging: the classical texts
 * name five tārās favourable, three difficult, and treat janma as mixed. Jade
 * reports which one the day falls in and shows the count. It does not extend
 * that into a claim about how the day will go, because the texts are about the
 * suitability of *undertakings* and not about fate — and because a colour that
 * quietly means "bad day" would make the promise on the front page false.
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

/**
 * What each tārā is classically taken to bear on.
 *
 * These are paraphrases of the muhūrta usage — what the position is considered
 * suitable or unsuitable *for* — and are deliberately about undertakings, not
 * about events that will happen to the reader.
 */
const TARA_NOTES: Record<string, string> = {
  Janma:
    'The Moon is back over your birth nakṣatra. The texts treat this as a mixed position — favoured for anything to do with the body and with the self, avoided for beginnings that need to outlast you.',
  Sampat:
    'Counted as the tārā of gain. Traditionally taken for acquisition and for anything you want to accumulate rather than spend.',
  Vipat:
    'Counted among the difficult three. The texts advise against beginnings here rather than warning of anything in particular — the classical use is a reason to postpone, not a forecast.',
  Kṣema:
    'The tārā of wellbeing and security. Taken for consolidation — repairs, maintenance, and anything meant to hold.',
  Pratyari:
    'Counted among the difficult three, and specifically about opposition: the texts read it as work meeting resistance, so they advise against contests and confrontations begun on it.',
  Sādhaka:
    'The tārā of accomplishment. Traditionally the strongest of the nine for finishing something already underway.',
  Vadha:
    'The third of the difficult tārās, and the one the texts are most cautious about. The classical advice is to attempt nothing new — again a rule about starting, not a claim about what happens.',
  Mitra:
    'The friendly tārā. Taken for anything involving other people — meeting, asking, negotiating.',
  'Ati-mitra':
    'The closest friend of the nine. Read much as Mitra, with the texts allowing it for the same undertakings with more confidence.',
};

/** Plain words for a band, used in the UI beside the colour. */
export const BAND_SUMMARY: Record<DayBand, string> = {
  favourable: 'Both counts land favourable',
  mixed: 'The two counts disagree',
  difficult: 'Both counts land difficult',
};

/**
 * The classical caution, printed wherever the band is.
 *
 * Not decoration. A coloured square is read as a verdict unless something
 * beside it says otherwise, and this is that something.
 */
export const BAND_CAVEAT =
  'These are muhūrta counts: they describe what the tradition considers a moment suited to, not what will happen. Both are computed from the Moon alone and neither knows anything about your day.';

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

/**
 * Which natal house a transiting longitude falls in.
 *
 * Whole-sign counting from the ascendant sign, which is the frame the rest of
 * the chart is read in. Under any other house system a transit's house would
 * need the cusps, and this returns null rather than quietly using the wrong
 * frame — a transit attributed to the wrong house is worse than one that says
 * nothing.
 */
export function transitHouse(chart: ComputedChart, longitude: number): number | null {
  if (chart.houses.system !== 'whole_sign') return null;
  const signIndex = Math.floor((((longitude % 360) + 360) % 360) / 30);
  return ((((signIndex - chart.houses.ascendantSign) % 12) + 12) % 12) + 1;
}

export interface DailyReading {
  readonly quality: DayQuality;
  readonly sections: readonly ReadingSection[];
}

export interface DailyOptions {
  /** The running daśā chain, outermost first. Omitted, the timing note is absent. */
  readonly dasha?: readonly DashaPeriod[];
  /** Today's pañcāṅga, for the tithi and vāra notes. */
  readonly panchanga?: Panchanga;
  /** Which transiting bodies to walk. The Moon is handled separately. */
  readonly bodies?: readonly string[];
}

const DEFAULT_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;

/**
 * Compose the day.
 *
 * `sky` is the transiting positions and `chart` the natal one; neither is read
 * from a clock here, which is what lets the whole thing be tested against a
 * fixed instant and rendered identically on the server and in a report.
 */
export function dailyReadingFor(
  chart: ComputedChart,
  sky: readonly SkyPosition[],
  options: DailyOptions = {},
): DailyReading | null {
  const natalMoon = chart.points.Moon;
  const transitMoon = sky.find((p) => p.id === 'Moon');
  if (!natalMoon || !transitMoon) return null;

  const quality = dayQuality(natalMoon.longitude, transitMoon.longitude);
  const sections: ReadingSection[] = [];

  // ------------------------------------------------------- the Moon and yours
  const moonHouse = transitHouse(chart, transitMoon.longitude);
  const moonHouseLib = moonHouse ? houseSignification(moonHouse) : null;
  const taraNote = TARA_NOTES[quality.tara.name] ?? '';

  const moonStatements: GroundedStatement[] = [
    {
      text: `The Moon is at ${degrees(transitMoon.degreesInSign)} ${transitMoon.sign}, in ${transitMoon.nakshatra}. Counted from ${quality.tara.fromNakshatra}, where your Moon sits natally, that is the ${quality.tara.index}${quality.tara.index === 1 ? 'st' : quality.tara.index === 2 ? 'nd' : quality.tara.index === 3 ? 'rd' : 'th'} tārā — ${quality.tara.name}, the tārā of ${quality.tara.meaning}. ${taraNote}`,
      factors: [
        {
          kind: 'Transit Moon',
          detail: `${degrees(transitMoon.degreesInSign)} ${transitMoon.sign} · ${transitMoon.nakshatra}`,
        },
        {
          kind: 'Natal Moon',
          detail: `${degrees(natalMoon.degreesInSign)} ${natalMoon.sign} · ${natalMoon.nakshatra.name}`,
        },
        {
          kind: 'Tārā bala',
          detail: `${quality.tara.index} of 9 — ${quality.tara.name} (cycle ${quality.tara.cycle})`,
        },
      ],
      source: 'Muhūrta Cintāmaṇi; Bṛhat Saṁhitā',
      anchor: { kind: 'nakshatra', key: transitMoon.nakshatra, label: transitMoon.nakshatra },
    },
    {
      text: `By sign, the Moon stands in the ${ORDINALS[quality.candra.house - 1]} from your natal Moon — ${quality.candra.fromSign} to ${quality.candra.toSign}. Candra bala counts the 1st, 3rd, 6th, 7th, 10th and 11th favourable and the 4th, 8th and 12th difficult, which puts today's count ${quality.candra.band === 'mixed' ? 'in neither group' : quality.candra.band}.`,
      factors: [
        { kind: 'Candra bala', detail: `${quality.candra.house}th from the natal Moon` },
        { kind: 'From', detail: quality.candra.fromSign },
        { kind: 'To', detail: quality.candra.toSign },
      ],
      source: 'Muhūrta Cintāmaṇi',
      anchor: { kind: 'graha', key: 'Moon', label: 'Moon' },
    },
  ];

  if (moonHouse && moonHouseLib) {
    moonStatements.push({
      text: `From the ascendant, the Moon is crossing your ${ORDINALS[moonHouse - 1]} house — ${list(moonHouseLib.keywords)}. The Moon spends about two and a quarter days in a sign, so this is the fastest-moving thing in the chart and the one that reliably tracks where attention goes rather than what changes.`,
      factors: [
        {
          kind: 'Transit house',
          detail: `${moonHouse} (whole sign, from ${SIGNS[chart.houses.ascendantSign]!} rising)`,
        },
        { kind: 'House', detail: moonHouseLib.title },
      ],
      source: moonHouseLib.source,
      anchor: { kind: 'house', key: String(moonHouse), label: `${moonHouse}th house` },
    });
  }

  sections.push({
    id: 'daily-moon',
    kicker: 'The Moon, and yours',
    title: 'Where the Moon stands to your chart',
    lede: BAND_CAVEAT,
    statements: moonStatements.filter(permitted),
  });

  // -------------------------------------------------------- the slower transits
  const bodies = options.bodies ?? DEFAULT_BODIES;
  const transitStatements: GroundedStatement[] = [];

  for (const id of bodies) {
    const position = sky.find((p) => p.id === id);
    if (!position) continue;
    const house = transitHouse(chart, position.longitude);
    if (!house) continue;
    const houseLib = houseSignification(house);
    const grahaLib = grahaSignification(id as never);
    if (!houseLib || !grahaLib) continue;

    const natal = chart.points[id];
    const returning = natal ? Math.floor(natal.longitude / 30) === position.signIndex : false;

    transitStatements.push({
      text: `${id} is transiting your ${ORDINALS[house - 1]} house at ${degrees(position.degreesInSign)} ${position.sign}${position.retrograde ? ', retrograde' : ''}. ${grahaLib.acts.charAt(0).toUpperCase()}${grahaLib.acts.slice(1)} whatever it occupies, and the ${ORDINALS[house - 1]} governs ${list(houseLib.keywords)}.${returning ? ` It is also back in the sign it occupies natally, which happens on its own cycle and not on yours.` : ''}${position.retrograde ? ' Retrograde motion is apparent, not real — the body is not reversing, the Earth is overtaking it — but the tradition reads the period as a revisiting rather than a first pass.' : ''}`,
      factors: [
        { kind: 'Transit', detail: `${id} ${degrees(position.degreesInSign)} ${position.sign}` },
        { kind: 'Natal house', detail: `${house} — ${houseLib.title}` },
        ...(natal
          ? [
              {
                kind: 'Natal position',
                detail: `${degrees(natal.degreesInSign)} ${natal.sign}, house ${natal.house}`,
              },
            ]
          : []),
        ...(position.retrograde ? [{ kind: 'Motion', detail: 'retrograde' }] : []),
      ],
      source: houseLib.source,
      anchor: { kind: 'graha', key: id, label: id },
    });
  }

  if (transitStatements.length) {
    sections.push({
      id: 'daily-transits',
      kicker: 'The slower hands',
      title: 'What is crossing your houses',
      lede: 'Houses counted whole-sign from your ascendant. These move in weeks and years rather than hours, so what is here today is mostly what was here yesterday — the value is in noticing when it changes.',
      statements: transitStatements.filter(permitted),
    });
  }

  // --------------------------------------------------- the day's own character
  const dayStatements: GroundedStatement[] = [];
  const panchanga = options.panchanga;

  if (panchanga) {
    dayStatements.push({
      text: `It is ${panchanga.tithi.name}, the ${panchanga.tithi.inPaksha}${panchanga.tithi.inPaksha === 1 ? 'st' : panchanga.tithi.inPaksha === 2 ? 'nd' : panchanga.tithi.inPaksha === 3 ? 'rd' : 'th'} tithi of the ${panchanga.tithi.paksha === 'shukla' ? 'waxing' : 'waning'} fortnight, ${Math.round(panchanga.tithi.elapsed * 100)}% elapsed. A tithi is the Moon gaining twelve degrees on the Sun, so it is a measure of the lunar month rather than of the solar day, and it does not line up with midnight.`,
      factors: [
        { kind: 'Tithi', detail: `${panchanga.tithi.name} (${panchanga.tithi.index} of 30)` },
        {
          kind: 'Pakṣa',
          detail: panchanga.tithi.paksha === 'shukla' ? 'śukla — waxing' : 'kṛṣṇa — waning',
        },
        { kind: 'Elongation', detail: `${degrees(panchanga.elongation)} Moon − Sun` },
      ],
      source: 'Sūrya Siddhānta',
      anchor: { kind: 'chart', key: 'chart', label: 'Today' },
    });

    if (panchanga.vara) {
      const varaLib = grahaSignification(panchanga.vara.lord as never);
      dayStatements.push({
        text: `The vāra is ${panchanga.vara.name}, ruled by ${panchanga.vara.lord}${varaLib ? ` — which ${varaLib.acts}` : ''}. The weekday lords are the oldest surviving piece of the system and are the reason the week has seven days at all.${panchanga.vara.beforeSunrise ? ' This instant falls before sunrise, so the vāra is still the previous civil day’s — the most common silent error in pañcāṅga software, and the reason Jade says it out loud.' : ''}`,
        factors: [
          { kind: 'Vāra', detail: `${panchanga.vara.name} — ${panchanga.vara.lord}` },
          ...(panchanga.vara.beforeSunrise
            ? [{ kind: 'Note', detail: 'before sunrise — previous vāra' }]
            : []),
        ],
        anchor: { kind: 'graha', key: panchanga.vara.lord, label: panchanga.vara.lord },
      });
    }

    dayStatements.push({
      text: `The nitya yoga is ${panchanga.yoga.name} and the karaṇa ${panchanga.karana.name}. Both are cut from the same Sun–Moon angle as the tithi — the yoga from their sum, the karaṇa from half a tithi — so all three move together and none of them is independent evidence of anything.`,
      factors: [
        { kind: 'Yoga', detail: panchanga.yoga.name },
        {
          kind: 'Karaṇa',
          detail: `${panchanga.karana.name}${panchanga.karana.isFixed ? ' (fixed)' : ''}`,
        },
      ],
      source: 'Sūrya Siddhānta',
      anchor: { kind: 'chart', key: 'chart', label: 'Today' },
    });
  }

  // The one genuinely personal timing link: today's nakṣatra lord against the
  // daśā lord actually running. Reported when they coincide and when they do
  // not, because "no connection today" is information too.
  const dasha = options.dasha;
  // The innermost period is the one actually running; the outer ones are its
  // context. Reading the chain from the wrong end names a lord whose period
  // may have decades left in it as though it were today's.
  const dashaLord = dasha?.[dasha.length - 1]?.lord;
  if (dasha?.length && dashaLord) {
    const chain = dasha.map((p) => p.lord).join(' → ');
    const lordLib = grahaSignification(dashaLord);
    const natalLord = chart.points[dashaLord];

    // The one real link between the day and the period: Vimśottarī is a
    // nakṣatra system, so the lord of the nakṣatra the Moon is in today is
    // drawn from the same nine. When it matches the running lord, the day and
    // the period are keyed to the same graha — which is a coincidence of
    // cycles, and worth naming as one rather than as a portent.
    const dayLord = transitMoon.nakshatraLord;
    const echoes = dayLord === dashaLord;

    dayStatements.push({
      text: `Underneath the day, ${chain} is running. ${dashaLord}${lordLib ? ` ${lordLib.acts}` : ''}${natalLord ? `, and in your chart it sits at ${degrees(natalLord.degreesInSign)} ${natalLord.sign} in the ${ORDINALS[natalLord.house - 1]} house` : ''}. A daśā is measured in years and a tithi in hours; when they seem to say different things, it is because they describe different sizes of thing.${echoes ? ` Today the Moon is in a nakṣatra ruled by ${dayLord} as well — Vimśottarī is built on the nakṣatras, so the two cycles share the same nine lords and land on the same one from time to time.` : ''}`,
      factors: [
        { kind: 'Daśā', detail: chain },
        ...(natalLord
          ? [
              {
                kind: `${dashaLord} natally`,
                detail: `${degrees(natalLord.degreesInSign)} ${natalLord.sign}, house ${natalLord.house}`,
              },
            ]
          : []),
        ...(echoes ? [{ kind: 'Nakṣatra lord today', detail: dayLord }] : []),
      ],
      anchor: { kind: 'dasha', key: dashaLord, label: `${dashaLord} daśā` },
    });
  }

  if (dayStatements.length) {
    sections.push({
      id: 'daily-panchanga',
      kicker: 'The day itself',
      title: 'What kind of day this is in the calendar',
      lede: 'True of everyone, not only of you — the pañcāṅga describes the day, not the person reading it.',
      statements: dayStatements.filter(permitted),
    });
  }

  return { quality, sections };
}
