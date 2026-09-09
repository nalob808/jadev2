import { NAKSHATRA_NAMES } from '@jade/astro';
import type { GlossaryEntry } from './glossary.js';
import { GRAHAS_LIB } from './significations/grahas.js';
import { HOUSES } from './significations/houses.js';
import { SIGNS_LIB } from './significations/signs.js';

/**
 * The signs, grahas and houses, as glossary entries.
 *
 * These three are already written down — at length, with sources — in the
 * significations libraries, because a reading is composed from them and the
 * `/learn` pages display them. Writing them a second time here would create
 * exactly the drift the interpret package exists to prevent: the lesson
 * saying one thing about the 7th house and the tooltip saying another.
 *
 * So they are derived. `Aries`, `Saturn` and `7th house` become hoverable
 * everywhere for free, and stay correct by construction.
 *
 * The nakṣatras are the exception below — they have no significations library
 * yet, so their reference data lives here until one exists.
 */

const CAP = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const SIGN_ENTRIES: GlossaryEntry[] = SIGNS_LIB.map((sign) => ({
  id: `sign-${sign.name.toLowerCase()}`,
  term: sign.name,
  plain: sign.plain,
  literal: sign.sanskrit,
  short: sign.summary,
  body: `${sign.body[0] ?? ''} Ruled by ${CAP(sign.lord)}; ${sign.element}, ${sign.modality}. Read for ${sign.keywords.slice(0, 4).join(', ')}.`,
  related: ['rasi', 'graha', 'bhava'],
}));

const GRAHA_ENTRIES: GlossaryEntry[] = GRAHAS_LIB.map((graha) => ({
  id: `graha-${graha.id.toLowerCase()}`,
  term: graha.sanskrit,
  plain: graha.plain,
  short: graha.summary,
  body: `${graha.body[0] ?? ''} Signifies ${graha.karaka.slice(0, 4).join(', ')}.${
    graha.rules.length > 0 ? ` Rules ${graha.rules.join(' and ')}.` : ''
  }${graha.exalted ? ` Exalted in ${graha.exalted}, debilitated in ${graha.debilitated}.` : ''}`,
  related: ['graha', 'dignity', 'dasha'],
}));

const HOUSE_ENTRIES: GlossaryEntry[] = HOUSES.map((house) => ({
  id: `house-${house.number}`,
  term: `${ordinal(house.number)} house`,
  plain: house.plain,
  literal: house.sanskrit,
  short: house.summary,
  body: `${house.body[0] ?? ''} Read for ${house.keywords.slice(0, 5).join(', ')}. Its kāraka is ${CAP(house.karaka)}.`,
  related: ['bhava', house.classes.includes('dusthana') ? 'dusthana' : 'kendra', 'karaka'],
}));

/**
 * The twenty-seven, with the reference facts a practitioner reaches for.
 *
 * Lord, deity and symbol, because those are what the tradition actually reads
 * a nakṣatra from — and because they are checkable facts rather than
 * character readings. No nakṣatra here is told what it means about a person:
 * the daśā lord and the symbol are stated, and the interpretation is left to
 * the practitioner, which is both the honest division of labour and what
 * keeps this clear of constitution #6.
 */
const NAKSHATRA_FACTS: readonly {
  readonly lord: string;
  readonly deity: string;
  readonly symbol: string;
}[] = [
  { lord: 'Ketu', deity: 'Aśvinī Kumāras', symbol: 'a horse’s head' },
  { lord: 'Venus', deity: 'Yama', symbol: 'a yoni' },
  { lord: 'Sun', deity: 'Agni', symbol: 'a razor or flame' },
  { lord: 'Moon', deity: 'Brahmā', symbol: 'a cart' },
  { lord: 'Mars', deity: 'Soma', symbol: 'a deer’s head' },
  { lord: 'Rāhu', deity: 'Rudra', symbol: 'a teardrop' },
  { lord: 'Jupiter', deity: 'Aditi', symbol: 'a quiver of arrows' },
  { lord: 'Saturn', deity: 'Bṛhaspati', symbol: 'a cow’s udder, a flower' },
  { lord: 'Mercury', deity: 'the Nāgas', symbol: 'a coiled serpent' },
  { lord: 'Ketu', deity: 'the Pitṛs', symbol: 'a throne' },
  { lord: 'Venus', deity: 'Bhaga', symbol: 'the front legs of a bed' },
  { lord: 'Sun', deity: 'Aryaman', symbol: 'the back legs of a bed' },
  { lord: 'Moon', deity: 'Savitṛ', symbol: 'a hand' },
  { lord: 'Mars', deity: 'Tvaṣṭṛ', symbol: 'a bright jewel' },
  { lord: 'Rāhu', deity: 'Vāyu', symbol: 'a young shoot, a sapling' },
  { lord: 'Jupiter', deity: 'Indra and Agni', symbol: 'an archway' },
  { lord: 'Saturn', deity: 'Mitra', symbol: 'a pearl, a potter’s wheel' },
  { lord: 'Mercury', deity: 'Indra', symbol: 'a circular amulet' },
  { lord: 'Ketu', deity: 'Nirṛti', symbol: 'a bunch of roots' },
  { lord: 'Venus', deity: 'the Viśvedevas', symbol: 'an elephant’s tusk' },
  { lord: 'Sun', deity: 'Brahmā', symbol: 'an ear, a fan' },
  { lord: 'Moon', deity: 'Viṣṇu', symbol: 'three footprints' },
  { lord: 'Mars', deity: 'the Vasus', symbol: 'a drum' },
  { lord: 'Rāhu', deity: 'Varuṇa', symbol: 'an empty circle' },
  { lord: 'Jupiter', deity: 'Aja Ekapāda', symbol: 'the front of a funeral cot' },
  { lord: 'Saturn', deity: 'Ahir Budhnya', symbol: 'the back of a funeral cot' },
  { lord: 'Mercury', deity: 'Pūṣan', symbol: 'a fish, a drum' },
];

const NAKSHATRA_ENTRIES: GlossaryEntry[] = NAKSHATRA_NAMES.map((name, index) => {
  const facts = NAKSHATRA_FACTS[index]!;
  const start = index * (360 / 27);
  return {
    id: `nakshatra-${name.toLowerCase().replace(/\s+/g, '-')}`,
    term: name,
    plain: name,
    short: `The ${ordinal(index + 1)} nakṣatra, ruled by ${facts.lord}.`,
    body: `Spans ${degrees(start)} to ${degrees(start + 360 / 27)} of the sidereal zodiac. Its deity is ${facts.deity} and its symbol ${facts.symbol}. Because ${facts.lord} rules it, a Moon here opens the Vimśottarī daśā on ${facts.lord}.`,
    related: ['nakshatra', 'pada', 'vimshottari'],
  };
});

function degrees(value: number): string {
  const whole = Math.floor(value % 360);
  const minutes = Math.round(((value % 360) - whole) * 60);
  return `${whole}°${String(minutes).padStart(2, '0')}′`;
}

/** Everything derived rather than hand-written. */
export const DERIVED_ENTRIES: readonly GlossaryEntry[] = [
  ...SIGN_ENTRIES,
  ...GRAHA_ENTRIES,
  ...HOUSE_ENTRIES,
  ...NAKSHATRA_ENTRIES,
];
