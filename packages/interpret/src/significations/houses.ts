/**
 * The twelve bhāvas.
 *
 * This is the teaching layer and the reading layer at once. A reading composed
 * for one person cites the same entry a student reads to learn what the house
 * *is*, which means there is exactly one place where "what the 7th house
 * means" is written down — and no way for the reading to drift from the
 * lesson.
 *
 * Every entry keeps the classical significations in `keywords` and the
 * explanation in `body`. The keywords are what a composed sentence is built
 * from; the body is what a person reads. Neither is generated.
 *
 * Sources are named per entry. Where a house carries a signification that only
 * some authorities give it, the entry says so rather than presenting a
 * contested attribution as settled.
 */

export type HouseGroup = 'kendra' | 'panaphara' | 'apoklima';
export type HouseClass = 'trikona' | 'dusthana' | 'upachaya' | 'maraka' | 'none';

export interface HouseSignification {
  readonly number: number;
  /** The classical name. */
  readonly sanskrit: string;
  /** Plain transliteration, always shown beside the diacritics. */
  readonly plain: string;
  readonly title: string;
  /** One line, for a chart tooltip. */
  readonly summary: string;
  /** The classical significations. A composed sentence draws from these. */
  readonly keywords: readonly string[];
  /** The teaching text. */
  readonly body: readonly string[];
  readonly group: HouseGroup;
  readonly classes: readonly HouseClass[];
  /** The graha that signifies this house's matters regardless of who occupies it. */
  readonly karaka: string;
  readonly source: string;
}

/**
 * Angularity, by position.
 *
 * Kendras (1, 4, 7, 10) are the pillars — a graha there acts on the world.
 * Paṇapharas (2, 5, 8, 11) follow and sustain. Āpoklimas (3, 6, 9, 12) fall
 * away and turn inward.
 */
function groupOf(house: number): HouseGroup {
  if ([1, 4, 7, 10].includes(house)) return 'kendra';
  if ([2, 5, 8, 11].includes(house)) return 'panaphara';
  return 'apoklima';
}

function classesOf(house: number): HouseClass[] {
  const out: HouseClass[] = [];
  if ([1, 5, 9].includes(house)) out.push('trikona');
  if ([6, 8, 12].includes(house)) out.push('dusthana');
  if ([3, 6, 10, 11].includes(house)) out.push('upachaya');
  if ([2, 7].includes(house)) out.push('maraka');
  return out.length ? out : ['none'];
}

const RAW: ReadonlyArray<
  Omit<HouseSignification, 'group' | 'classes'> & { group?: never; classes?: never }
> = [
  {
    number: 1,
    sanskrit: 'Lagna / Tanu bhāva',
    plain: 'Lagna / Tanu bhava',
    title: 'The self, the body, the beginning',
    summary: 'Constitution, appearance, temperament, and the whole chart’s reference point.',
    keywords: [
      'body',
      'appearance',
      'vitality',
      'temperament',
      'early life',
      'how you begin things',
    ],
    body: [
      'The first house is not a topic like the others — it is the point everything else is measured from. The sign rising here fixes which sign each of the remaining eleven houses falls in, which is why two people born on the same day with different rising signs have almost nothing in common structurally.',
      'What it signifies in its own right is the body and the temperament: physical constitution, general vitality, the impression a person makes before speaking, and the characteristic way they start things. Its lord is the single most important graha in the chart, because that graha carries the self into whichever house it occupies.',
      'A graha in the first house colours the personality directly and visibly. Benefics here tend to show as ease of manner; malefics as intensity, and often as a mark on the body.',
    ],
    karaka: 'Sun',
    source: 'BPHS ch. 11–12',
  },
  {
    number: 2,
    sanskrit: 'Dhana bhāva',
    plain: 'Dhana bhava',
    title: 'Wealth, speech, and what you keep close',
    summary: 'Accumulated resources, family of origin, speech, food, and the face.',
    keywords: ['wealth', 'savings', 'speech', 'family', 'food', 'the face', 'values'],
    body: [
      'The second house holds what a person accumulates and keeps: money already earned rather than money being earned, possessions, and the immediate family they were born into. It is the house of resources at rest.',
      'It also governs speech — and this pairing is not arbitrary. Both are about what issues from the self and what the self holds: the mouth that eats, the mouth that speaks, and the store that feeds both. Grahas here shape the voice as much as the bank balance.',
      'It is one of the two māraka houses. Classical texts treat that with a gravity Jade deliberately does not reproduce as prediction — the useful reading is that second-house matters can become a source of pressure, not that anything is foretold.',
    ],
    karaka: 'Jupiter',
    source: 'BPHS ch. 12; Phaladīpikā ch. 2',
  },
  {
    number: 3,
    sanskrit: 'Sahaja bhāva',
    plain: 'Sahaja bhava',
    title: 'Courage, siblings, and the effort you make yourself',
    summary: 'Initiative, younger siblings, short journeys, hands, and skill acquired by practice.',
    keywords: [
      'courage',
      'initiative',
      'younger siblings',
      'skill',
      'short journeys',
      'communication',
      'hands',
    ],
    body: [
      'The third is the house of self-made effort. Where the ninth gives fortune that arrives, the third gives capability that is earned — courage, drive, manual skill, the willingness to try something and be bad at it first.',
      'It signifies siblings, particularly younger ones, and by extension peers and the people one competes alongside. It also holds short journeys, correspondence, and the hands and arms.',
      'It is an upachaya house — a "growing" house — which is the key to reading malefics here. Mars or Saturn in the third is generally read as strengthening rather than afflicting, because the difficulty they bring is the kind that builds capacity.',
    ],
    karaka: 'Mars',
    source: 'BPHS ch. 12; Sārāvalī ch. 12',
  },
  {
    number: 4,
    sanskrit: 'Sukha bhāva',
    plain: 'Sukha bhava',
    title: 'Mother, home, and inner comfort',
    summary: 'The mother, dwelling, land, vehicles, formal education, and emotional foundation.',
    keywords: [
      'mother',
      'home',
      'land',
      'property',
      'vehicles',
      'schooling',
      'inner peace',
      'heart',
    ],
    body: [
      'The fourth is the foundation of the chart — literally, in the North Indian diagram it sits at the bottom, and structurally it is what everything else stands on. It signifies the mother, the home, land and buildings, and the felt sense of having somewhere to belong.',
      'Its name is sukha: comfort, ease, contentment. That is the honest translation of what the house is about — not happiness in the modern sense but the settled base from which a person can act. Formal education belongs here too, as the thing the home provides.',
      'Being a kendra, it is one of the four strong angles. A graha here has weight, and its condition tends to show in whether the person describes home as a refuge or as something unresolved.',
    ],
    karaka: 'Moon',
    source: 'BPHS ch. 12; Phaladīpikā ch. 2',
  },
  {
    number: 5,
    sanskrit: 'Putra bhāva',
    plain: 'Putra bhava',
    title: 'Children, intelligence, and what you carry from before',
    summary: 'Offspring, creative intelligence, discernment, mantra, and pūrva puṇya.',
    keywords: [
      'children',
      'intelligence',
      'creativity',
      'discernment',
      'mantra',
      'romance',
      'merit earned previously',
    ],
    body: [
      'The fifth is the strongest of the trikoṇa houses after the first, and the classical texts treat it as the house of pūrva puṇya — merit carried from before this life. Whether or not one takes that literally, the practical reading is consistent: the fifth shows what comes to a person easily and without apparent cause.',
      'It signifies children, and also everything else a person produces from themselves: creative work, speculation, and the particular quality of intelligence called dhī — discernment rather than mere cleverness. Mantra and initiated practice belong here.',
      'Romance sits here rather than in the seventh, which surprises people. The seventh is partnership and contract; the fifth is attraction and play.',
    ],
    karaka: 'Jupiter',
    source: 'BPHS ch. 12; Jātaka Pārijāta ch. 6',
  },
  {
    number: 6,
    sanskrit: 'Ripu / Roga bhāva',
    plain: 'Ripu / Roga bhava',
    title: 'Obstacles, service, and daily discipline',
    summary: 'Adversaries, debts, service, routine work, and the discipline that meets difficulty.',
    keywords: [
      'obstacles',
      'adversaries',
      'debts',
      'service',
      'daily work',
      'discipline',
      'maternal uncle',
    ],
    body: [
      'The sixth is a duḥsthāna — one of the three difficult houses — and it holds enemies, debts, and the friction of daily life. But it is also an upachaya house, and those two facts together are the whole art of reading it: the sixth is where difficulty is met, and meeting it is what produces competence.',
      'It signifies service in both senses — work performed for others, and the people who perform it. Routine, regimen, and anything done daily because it must be done belongs here.',
      'Classical texts also assign illness to this house. Jade names the house and its significations, and does not generate statements about health outcomes — that is a hard product rule, not a limitation of the technique.',
    ],
    karaka: 'Mars',
    source: 'BPHS ch. 12; Phaladīpikā ch. 2',
  },
  {
    number: 7,
    sanskrit: 'Kalatra / Yuvati bhāva',
    plain: 'Kalatra / Yuvati bhava',
    title: 'Partnership, and the other person',
    summary: 'Spouse, business partners, contracts, negotiation, and open dealings with others.',
    keywords: [
      'spouse',
      'partnership',
      'contracts',
      'business partners',
      'negotiation',
      'the public',
      'travel abroad',
    ],
    body: [
      'The seventh is directly opposite the first, and that opposition is the meaning: it is the not-self, the other party, the person across the table. It governs marriage and the spouse, business partnership, and any binding agreement between two parties.',
      'Because it faces the first house, it is also how a person meets the world in the open — dealings conducted in public rather than privately. Some authorities extend it to residence away from one’s birthplace.',
      'It is a kendra and also a māraka house, which is a genuinely awkward combination and is one reason seventh-house readings vary so much between schools. Jade shows what occupies it and what aspects it, and leaves the synthesis to the practitioner.',
    ],
    karaka: 'Venus',
    source: 'BPHS ch. 12; Sārāvalī ch. 12',
  },
  {
    number: 8,
    sanskrit: 'Randhra / Āyu bhāva',
    plain: 'Randhra / Ayu bhava',
    title: 'What is hidden, shared, and transformed',
    summary: 'Longevity, inheritance, others’ resources, occult study, and sudden change.',
    keywords: [
      'hidden things',
      'inheritance',
      'partner’s resources',
      'research',
      'occult study',
      'sudden change',
      'longevity',
    ],
    body: [
      'The eighth is the most misread house in the system. Its name randhra means an opening or a weak point, and it holds what is concealed: inheritance, insurance, dowry, the resources that come through other people rather than one’s own earning.',
      'It is the house of research in the literal sense — of digging for what is not on the surface. Occult study, deep investigation, and any discipline that requires going underneath the visible belongs here. Grahas in the eighth often show as a person who cannot leave a hidden thing alone.',
      'It is also called āyu bhāva, the house of lifespan, and the classical literature builds elaborate longevity calculations on it. Jade computes none of them and prints none of them.',
    ],
    karaka: 'Saturn',
    source: 'BPHS ch. 12; Jātaka Pārijāta ch. 7',
  },
  {
    number: 9,
    sanskrit: 'Dharma / Bhāgya bhāva',
    plain: 'Dharma / Bhagya bhava',
    title: 'Fortune, the teacher, and what you believe',
    summary: 'Father, guru, higher learning, pilgrimage, law, and fortune that arrives unearned.',
    keywords: [
      'fortune',
      'father',
      'guru',
      'higher learning',
      'philosophy',
      'long journeys',
      'pilgrimage',
      'law',
    ],
    body: [
      'The ninth is the most auspicious house in the chart — the strongest trikoṇa, and the one the texts call bhāgya, fortune. Its distinguishing quality is that what it gives is not earned by effort in the way the third or tenth is earned. It arrives.',
      'It signifies the father, the guru, and by extension every teacher and every transmitted tradition. Higher learning, philosophy, religious practice and law all sit here, as do long journeys and pilgrimage.',
      'The ninth from the ninth is the fifth, which is why those two houses reinforce each other so strongly, and why a connection between their lords is one of the most consistently well-regarded configurations in the system.',
    ],
    karaka: 'Jupiter',
    source: 'BPHS ch. 12; Phaladīpikā ch. 2',
  },
  {
    number: 10,
    sanskrit: 'Karma bhāva',
    plain: 'Karma bhava',
    title: 'Work, standing, and visible action',
    summary: 'Profession, reputation, authority, and action taken in the world.',
    keywords: [
      'profession',
      'career',
      'reputation',
      'authority',
      'status',
      'visible action',
      'government',
    ],
    body: [
      'The tenth is the house of karma in its plainest sense: action performed in the world and visible to it. Profession, standing, reputation and dealings with authority all belong here.',
      'It is the highest point of the chart and the strongest kendra for worldly matters. A graha placed here acts publicly whether or not the person wants it to — the tenth does not do private.',
      'It is also an upachaya house, which is why tenth-house difficulty so often reads as a career that is hard early and substantial later. The classical statement is that malefics in upachaya houses improve with time; in the tenth that is nearly a rule.',
    ],
    karaka: 'Sun',
    source: 'BPHS ch. 12; Sārāvalī ch. 12',
  },
  {
    number: 11,
    sanskrit: 'Lābha bhāva',
    plain: 'Labha bhava',
    title: 'Gains, networks, and what comes back to you',
    summary: 'Income, profit, elder siblings, friendships, and the fulfilment of desires.',
    keywords: [
      'gains',
      'income',
      'profit',
      'friends',
      'networks',
      'elder siblings',
      'desires fulfilled',
    ],
    body: [
      'The eleventh is lābha — gain. Where the second holds wealth already accumulated, the eleventh is the flow of income arriving: profit, returns, and the fulfilment of things wanted.',
      'It governs friendships and networks, elder siblings, and associations of all kinds. Much of what it delivers arrives through other people, which is why a strong eleventh so often reads as someone whose circle is unusually useful to them.',
      'It is an upachaya house and the strongest one for malefics. Saturn or Mars here is generally read as increasing gain rather than obstructing it — one of the clearest cases in the system where a malefic placement is straightforwardly good.',
    ],
    karaka: 'Jupiter',
    source: 'BPHS ch. 12; Phaladīpikā ch. 2',
  },
  {
    number: 12,
    sanskrit: 'Vyaya bhāva',
    plain: 'Vyaya bhava',
    title: 'Expenditure, retreat, and release',
    summary: 'Losses, expenses, foreign lands, seclusion, sleep, and liberation.',
    keywords: [
      'expenditure',
      'loss',
      'foreign lands',
      'seclusion',
      'retreat',
      'sleep',
      'liberation',
      'charity',
    ],
    body: [
      'The twelfth is vyaya — expenditure. Everything that leaves: money spent, energy given away, time in places that are not home. It is a duḥsthāna, and read carelessly it is simply the house of loss.',
      'Read properly it is more interesting than that, because expenditure is not the same as waste. The twelfth governs charity, retreat, contemplative practice and sleep — all forms of deliberate release. It is also the house of mokṣa, liberation, and the final trikoṇa of that group.',
      'It signifies foreign residence and distant places, which in a modern chart often reads more literally than any other twelfth-house significaton. Grahas here tend to operate away from the person’s place of origin, or out of public view.',
    ],
    karaka: 'Saturn',
    source: 'BPHS ch. 12; Jātaka Pārijāta ch. 10',
  },
];

export const HOUSES: readonly HouseSignification[] = RAW.map((entry) => ({
  ...entry,
  group: groupOf(entry.number),
  classes: classesOf(entry.number),
}));

export function houseSignification(house: number): HouseSignification | undefined {
  return HOUSES.find((entry) => entry.number === house);
}

export const HOUSE_GROUP_LABELS: Record<HouseGroup, string> = {
  kendra: 'Kendra — an angle',
  panaphara: 'Paṇaphara — succedent',
  apoklima: 'Āpoklima — cadent',
};

export const HOUSE_CLASS_LABELS: Record<HouseClass, string> = {
  trikona: 'Trikoṇa — a trine, and auspicious',
  dusthana: 'Duḥsthāna — a difficult house',
  upachaya: 'Upachaya — a growing house, where difficulty builds capacity',
  maraka: 'Māraka',
  none: '',
};
