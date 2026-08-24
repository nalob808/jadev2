/**
 * The nine grahas.
 *
 * "Planet" is a poor translation. A graha is a *seizer* — something that takes
 * hold of an area of life and acts on it. That is why the nodes belong in the
 * list despite being points rather than bodies, and it is the frame these
 * entries are written from.
 *
 * `kāraka` is what a graha signifies wherever it sits, independent of house.
 * It is the part students most often skip and the part that makes a reading
 * specific rather than generic.
 */

export type Nature = 'benefic' | 'malefic' | 'mixed';

export interface GrahaSignification {
  readonly id: string;
  readonly sanskrit: string;
  readonly plain: string;
  readonly glyph: string;
  readonly nature: Nature;
  readonly summary: string;
  /** What it signifies wherever it falls. */
  readonly karaka: readonly string[];
  readonly rules: readonly string[];
  readonly exalted?: string;
  readonly debilitated?: string;
  readonly body: readonly string[];
  /** How it behaves in a house it does not own — the phrase a reading composes with. */
  readonly acts: string;
  readonly source: string;
}

export const GRAHAS_LIB: readonly GrahaSignification[] = [
  {
    id: 'Sun',
    sanskrit: 'Sūrya',
    plain: 'Surya',
    glyph: '☉',
    nature: 'malefic',
    summary: 'The self, authority, the father, and what a person cannot delegate.',
    karaka: ['the soul', 'the father', 'authority', 'vitality', 'reputation', 'government'],
    rules: ['Leo'],
    exalted: 'Aries',
    debilitated: 'Libra',
    body: [
      'Sūrya is ātmakāraka in the fixed sense — the significator of the self, the centre a chart organises around. It governs the father, authority in general, and standing in the world.',
      'It is classed as a malefic, which surprises beginners. The reasoning is about heat and dryness rather than misfortune: the Sun burns what stands too close to it, which is why combustion exists as a technical condition at all.',
    ],
    acts: 'takes charge of',
    source: 'BPHS ch. 3; Phaladīpikā ch. 2',
  },
  {
    id: 'Moon',
    sanskrit: 'Candra',
    plain: 'Chandra',
    glyph: '☽',
    nature: 'benefic',
    summary: 'The mind, the mother, and how a person receives what happens to them.',
    karaka: ['the mind', 'the mother', 'emotion', 'the public', 'memory', 'liquids'],
    rules: ['Cancer'],
    exalted: 'Taurus',
    debilitated: 'Scorpio',
    body: [
      'Candra is manaḥkāraka — the mind, meaning the receiving and responding part rather than the reasoning part, which belongs to Mercury. It signifies the mother, emotional life, and the general public.',
      'Its benefic status is conditional on its phase: a waxing Moon is benefic and a waning one is not, which is one of the few places the system makes a graha’s nature depend on a measurement rather than a fixed table.',
      'It moves faster than anything else in the chart, and much of Jyotiṣa is organised from it — Vimśottarī daśā begins from the Moon’s nakṣatra, and the whole Candra lagna technique reads the chart again with the Moon as the first house.',
    ],
    acts: 'feels its way through',
    source: 'BPHS ch. 3; Sārāvalī ch. 4',
  },
  {
    id: 'Mars',
    sanskrit: 'Maṅgala',
    plain: 'Mangala',
    glyph: '♂',
    nature: 'malefic',
    summary: 'Force, courage, siblings, and the willingness to cut.',
    karaka: ['courage', 'energy', 'younger siblings', 'land', 'conflict', 'surgery', 'machinery'],
    rules: ['Aries', 'Scorpio'],
    exalted: 'Capricorn',
    debilitated: 'Cancer',
    body: [
      'Maṅgala is force applied directly. It signifies courage, physical energy, younger siblings, land and property disputes, and anything that involves cutting — from surgery to engineering.',
      'It is a natural malefic, and its difficulty is real: Mars breaks things. But it is also the graha that makes action possible at all, and a chart with a weak Mars is not a gentle chart so much as one that struggles to start.',
      'Its placement drives maṅgala doṣa, which Jade computes together with its classical cancellations rather than in isolation.',
    ],
    acts: 'pushes hard at',
    source: 'BPHS ch. 3; Phaladīpikā ch. 2',
  },
  {
    id: 'Mercury',
    sanskrit: 'Budha',
    plain: 'Budha',
    glyph: '☿',
    nature: 'mixed',
    summary: 'Intellect, speech, commerce, and the ability to hold a distinction.',
    karaka: ['intellect', 'speech', 'commerce', 'writing', 'calculation', 'friends', 'skin'],
    rules: ['Gemini', 'Virgo'],
    exalted: 'Virgo',
    debilitated: 'Pisces',
    body: [
      'Budha is the discriminating intellect — the faculty that tells one thing from another, counts, writes and trades. Where the Moon receives, Mercury analyses.',
      'Its nature is conditional in a way no other graha’s is: Mercury takes on the character of whatever it sits with. Alone it is benefic; with a malefic it becomes one. This is why a reading that names Mercury’s associations is far more useful than one that names only its house.',
      'It is the only graha both ruling and exalted in the same sign, Virgo, which makes that placement unusually pure.',
    ],
    acts: 'thinks and talks its way around',
    source: 'BPHS ch. 3; Sārāvalī ch. 4',
  },
  {
    id: 'Jupiter',
    sanskrit: 'Guru / Bṛhaspati',
    plain: 'Guru / Brihaspati',
    glyph: '♃',
    nature: 'benefic',
    summary: 'Expansion, wisdom, the teacher, and what grows without being forced.',
    karaka: ['wisdom', 'children', 'wealth', 'the teacher', 'law', 'religion', 'expansion'],
    rules: ['Sagittarius', 'Pisces'],
    exalted: 'Cancer',
    debilitated: 'Capricorn',
    body: [
      'Guru is the great benefic. It signifies wisdom, teachers, children, law and religious life, and its method is expansion — whatever it touches gets larger.',
      'That is not unconditionally good, and reading it as such is the most common beginner error. Jupiter in a difficult house expands the difficulty. Jupiter on a malefic amplifies it.',
      'Its aspects matter more than most: Jupiter alone aspects the 5th and 9th from itself in addition to the 7th, which means a well-placed Jupiter reaches three houses rather than one.',
    ],
    acts: 'expands and blesses',
    source: 'BPHS ch. 3; Phaladīpikā ch. 2',
  },
  {
    id: 'Venus',
    sanskrit: 'Śukra',
    plain: 'Shukra',
    glyph: '♀',
    nature: 'benefic',
    summary: 'Value, pleasure, the partner, and the capacity to be drawn toward something.',
    karaka: ['the spouse', 'pleasure', 'art', 'vehicles', 'luxury', 'value', 'reproduction'],
    rules: ['Taurus', 'Libra'],
    exalted: 'Pisces',
    debilitated: 'Virgo',
    body: [
      'Śukra signifies the partner, the senses, art and beauty, and value in both the aesthetic and the financial sense. It is the second benefic and the kāraka of marriage.',
      'Classically it is also the guru of the asuras and holds the mantra of revival — a detail worth knowing because it explains why Venus is associated with regeneration and not only with pleasure.',
      'Its most useful practical signification is discernment about worth: what a person is drawn to, and what they are willing to pay for it.',
    ],
    acts: 'is drawn toward',
    source: 'BPHS ch. 3; Sārāvalī ch. 4',
  },
  {
    id: 'Saturn',
    sanskrit: 'Śani',
    plain: 'Shani',
    glyph: '♄',
    nature: 'malefic',
    summary: 'Time, limitation, labour, and what is only earned slowly.',
    karaka: ['time', 'longevity', 'labour', 'discipline', 'sorrow', 'the elderly', 'servants'],
    rules: ['Capricorn', 'Aquarius'],
    exalted: 'Libra',
    debilitated: 'Aries',
    body: [
      'Śani is time itself — the graha of delay, limitation, and everything that has to be worked for. It is the strongest malefic and the most misunderstood.',
      'What Saturn withholds it withholds in order to make it durable. Its placements are typically the areas of life that come late and then stay. A reading that treats Saturn only as misfortune misses the entire point of the graha.',
      'It is exalted in Libra, the sign of weighing — Saturn’s impartiality is at its best where judgement is the task.',
    ],
    acts: 'slows and tests',
    source: 'BPHS ch. 3; Phaladīpikā ch. 2',
  },
  {
    id: 'Rahu',
    sanskrit: 'Rāhu',
    plain: 'Rahu',
    glyph: '☊',
    nature: 'malefic',
    summary: 'The north node — appetite, foreignness, and amplification without limit.',
    karaka: ['obsession', 'foreign things', 'sudden gain', 'illusion', 'technology', 'ambition'],
    rules: [],
    body: [
      'Rāhu is the north lunar node — a point, not a body, which is why it has no rulership and casts no light. It is the head of the severed asura: appetite without a stomach.',
      'It amplifies whatever it touches and gives it a hunger. It signifies foreignness in every sense, sudden and unearned gain, obsession, and things that are not what they appear to be.',
      'It is always retrograde. Where it appears, the classical reading is that the area is unregulated — it can produce spectacular results and no sense of when to stop.',
    ],
    acts: 'magnifies and unsettles',
    source: 'BPHS ch. 3; Jātaka Pārijāta ch. 2',
  },
  {
    id: 'Ketu',
    sanskrit: 'Ketu',
    plain: 'Ketu',
    glyph: '☋',
    nature: 'malefic',
    summary: 'The south node — detachment, mastery already held, and what is let go of.',
    karaka: ['detachment', 'liberation', 'past mastery', 'insight', 'loss', 'ascetic practice'],
    rules: [],
    body: [
      'Ketu is the south node and Rāhu’s opposite in every respect — the body without the head. Where Rāhu craves, Ketu has already had it and is done.',
      'It signifies detachment, spiritual practice, and mastery carried from before that arrives without training. Its difficulty is that it also signifies loss of interest: the area it touches often works well and is not valued by the person.',
      'Always exactly opposite Rāhu, always retrograde, and traditionally the more spiritual of the two.',
    ],
    acts: 'withdraws from and refines',
    source: 'BPHS ch. 3; Jātaka Pārijāta ch. 2',
  },
];

export function grahaSignification(id: string): GrahaSignification | undefined {
  return GRAHAS_LIB.find((entry) => entry.id === id);
}

export const NATURE_LABELS: Record<Nature, string> = {
  benefic: 'Śubha — a natural benefic',
  malefic: 'Krūra / pāpa — a natural malefic',
  mixed: 'Takes the nature of its company',
};
