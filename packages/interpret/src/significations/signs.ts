/**
 * The twelve rāśis.
 *
 * A sign is not a personality here. In Jyotiṣa a rāśi is the *medium* a graha
 * acts through — it says how something operates, not what a person is like.
 * That distinction is the single most useful thing a student can learn early,
 * and it is why these entries describe modality and element before anything
 * resembling character.
 */

export type Modality = 'movable' | 'fixed' | 'dual';
export type Element = 'fire' | 'earth' | 'air' | 'water';

export interface SignSignification {
  readonly index: number;
  readonly name: string;
  readonly sanskrit: string;
  readonly plain: string;
  readonly lord: string;
  readonly modality: Modality;
  readonly element: Element;
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly body: readonly string[];
  readonly source: string;
}

export const MODALITY_LABELS: Record<Modality, string> = {
  movable: 'Cara — movable. Initiates, changes, does not stay.',
  fixed: 'Sthira — fixed. Holds, consolidates, resists being moved.',
  dual: 'Dvisvabhāva — dual. Adapts, mediates, works both ways.',
};

export const ELEMENT_LABELS: Record<Element, string> = {
  fire: 'Agni — fire. Direction, will, visibility.',
  earth: 'Pṛthvī — earth. Substance, patience, the material result.',
  air: 'Vāyu — air. Exchange, contact, movement of ideas.',
  water: 'Jala — water. Feeling, memory, what flows and what holds.',
};

export const SIGNS_LIB: readonly SignSignification[] = [
  {
    index: 0,
    name: 'Aries',
    sanskrit: 'Meṣa',
    plain: 'Mesha',
    lord: 'Mars',
    modality: 'movable',
    element: 'fire',
    summary: 'Movable fire, ruled by Mars — beginnings taken without waiting for permission.',
    keywords: ['initiative', 'directness', 'speed', 'competition', 'the head'],
    body: [
      'The first sign, and movable fire. A graha in Meṣa acts first and considers afterwards — it starts things, and its characteristic failure is starting more than it finishes.',
      'Mars rules it, so anything placed here takes on some of Mars’s quality: force applied directly rather than negotiated. The Sun is exalted in Meṣa and Saturn is debilitated, which tells you most of what you need: this is a sign for assertion, not for patience.',
    ],
    source: 'BPHS ch. 4; Sārāvalī ch. 3',
  },
  {
    index: 1,
    name: 'Taurus',
    sanskrit: 'Vṛṣabha',
    plain: 'Vrishabha',
    lord: 'Venus',
    modality: 'fixed',
    element: 'earth',
    summary: 'Fixed earth, ruled by Venus — holding, valuing, and making things last.',
    keywords: ['stability', 'resources', 'the senses', 'patience', 'the face and throat'],
    body: [
      'Fixed earth: whatever sits here settles in and does not move easily. Vṛṣabha accumulates, values, and takes its time, which reads as steadiness or as stubbornness depending on what else is going on.',
      'Venus rules it, giving it a strong relationship to the senses, to comfort, and to what is worth keeping. The Moon is exalted here, which is one of the clearest statements in the system that the mind does well when it is settled.',
    ],
    source: 'BPHS ch. 4; Phaladīpikā ch. 1',
  },
  {
    index: 2,
    name: 'Gemini',
    sanskrit: 'Mithuna',
    plain: 'Mithuna',
    lord: 'Mercury',
    modality: 'dual',
    element: 'air',
    summary: 'Dual air, ruled by Mercury — exchange, dexterity, and holding two things at once.',
    keywords: ['communication', 'dexterity', 'curiosity', 'duality', 'hands and lungs'],
    body: [
      'Dual air. Mithuna is the sign of exchange — of information, of hands, of two things being true at the same time. A graha here works through contact and articulation rather than force.',
      'Mercury rules it, and Mercury’s adaptability is the sign’s defining quality. Its weakness is the same as its strength: an ability to argue either side can become an inability to settle on one.',
    ],
    source: 'BPHS ch. 4; Sārāvalī ch. 3',
  },
  {
    index: 3,
    name: 'Cancer',
    sanskrit: 'Karka',
    plain: 'Karka',
    lord: 'Moon',
    modality: 'movable',
    element: 'water',
    summary: 'Movable water, ruled by the Moon — feeling that moves, and the instinct to shelter.',
    keywords: ['nurture', 'memory', 'the home', 'protection', 'the chest'],
    body: [
      'Movable water — feeling in motion. Karka responds rather than initiates, but it does respond, and the response is protective. It signifies the mother, the home, and the instinct to make a safe container.',
      'The Moon rules it and Jupiter is exalted here, which is why Karka placements so often read as generous. Mars is debilitated: direct aggression does not work well through a medium whose method is shelter.',
    ],
    source: 'BPHS ch. 4; Phaladīpikā ch. 1',
  },
  {
    index: 4,
    name: 'Leo',
    sanskrit: 'Siṁha',
    plain: 'Simha',
    lord: 'Sun',
    modality: 'fixed',
    element: 'fire',
    summary: 'Fixed fire, ruled by the Sun — steady authority and the need to be seen.',
    keywords: ['authority', 'dignity', 'display', 'leadership', 'the heart'],
    body: [
      'Fixed fire: a flame that stays lit rather than one that flares. Siṁha holds position, and a graha here acts with a certain amount of ceremony — it wants its action acknowledged.',
      'The Sun rules it, and it is the only sign the Sun rules, which makes it unusually singular. No graha is exalted or debilitated here, so the sign’s character comes almost entirely from solar dignity: standing, self-possession, and the risk of mistaking display for substance.',
    ],
    source: 'BPHS ch. 4; Sārāvalī ch. 3',
  },
  {
    index: 5,
    name: 'Virgo',
    sanskrit: 'Kanyā',
    plain: 'Kanya',
    lord: 'Mercury',
    modality: 'dual',
    element: 'earth',
    summary: 'Dual earth, ruled by Mercury — discrimination, method, and useful work.',
    keywords: ['analysis', 'method', 'service', 'refinement', 'the digestion'],
    body: [
      'Dual earth. Kanyā separates, sorts and refines — it is the sign of discrimination in the technical sense, of telling one thing from another accurately.',
      'Mercury both rules and is exalted here, the only sign where a graha does both, which makes Kanyā the strongest expression of Mercurial method in the zodiac. Venus is debilitated: a medium built for scrutiny is a poor one for pure enjoyment.',
    ],
    source: 'BPHS ch. 4; Phaladīpikā ch. 1',
  },
  {
    index: 6,
    name: 'Libra',
    sanskrit: 'Tulā',
    plain: 'Tula',
    lord: 'Venus',
    modality: 'movable',
    element: 'air',
    summary: 'Movable air, ruled by Venus — weighing, trading, and finding the balance point.',
    keywords: ['balance', 'exchange', 'agreements', 'aesthetics', 'trade'],
    body: [
      'Movable air, and the only sign represented by an inanimate object — a pair of scales. Tulā is the sign of weighing: comparison, negotiation, and the search for a fair settlement.',
      'Venus rules it and Saturn is exalted here, which is a genuinely interesting pairing: Saturn’s impartiality does its best work in a medium designed for judgement. The Sun is debilitated — singular authority does not sit well where everything must be balanced against something else.',
    ],
    source: 'BPHS ch. 4; Sārāvalī ch. 3',
  },
  {
    index: 7,
    name: 'Scorpio',
    sanskrit: 'Vṛścika',
    plain: 'Vrischika',
    lord: 'Mars',
    modality: 'fixed',
    element: 'water',
    summary: 'Fixed water, ruled by Mars — depth held under pressure, and what is not shown.',
    keywords: ['depth', 'intensity', 'secrecy', 'research', 'regeneration'],
    body: [
      'Fixed water. Feeling that does not move and does not surface — Vṛścika holds, and what it holds is under pressure. It is the natural sign of research, of the hidden, and of things that transform by going through rather than around.',
      'Mars rules it, but Mars operating through water rather than fire: force applied indirectly and with patience. The Moon is debilitated here, which is the classical statement that a mind in this medium finds calm hard to come by.',
    ],
    source: 'BPHS ch. 4; Phaladīpikā ch. 1',
  },
  {
    index: 8,
    name: 'Sagittarius',
    sanskrit: 'Dhanu',
    plain: 'Dhanu',
    lord: 'Jupiter',
    modality: 'dual',
    element: 'fire',
    summary: 'Dual fire, ruled by Jupiter — aim, principle, and the long view.',
    keywords: ['philosophy', 'aim', 'teaching', 'travel', 'ethics', 'the thighs'],
    body: [
      'Dual fire, and the archer: fire with a target. Dhanu is the sign of aim and of principle — a graha here acts in service of something it believes rather than for its own sake.',
      'Jupiter rules it, giving it teaching, law, philosophy and long journeys. Its characteristic weakness is the same as its strength: certainty about direction can become an unwillingness to check the map.',
    ],
    source: 'BPHS ch. 4; Sārāvalī ch. 3',
  },
  {
    index: 9,
    name: 'Capricorn',
    sanskrit: 'Makara',
    plain: 'Makara',
    lord: 'Saturn',
    modality: 'movable',
    element: 'earth',
    summary: 'Movable earth, ruled by Saturn — structure built deliberately, over time.',
    keywords: ['discipline', 'structure', 'ambition', 'endurance', 'the knees'],
    body: [
      'Movable earth — an unusual combination, and the reason Makara reads as ambition rather than mere solidity. It builds, and it builds according to a plan, and it does not expect the result soon.',
      'Saturn rules it. Mars is exalted here, which is one of the system’s better jokes: raw force does its finest work when it is given a structure and a deadline. Jupiter is debilitated — expansion for its own sake gets no traction in a medium that only respects what is earned.',
    ],
    source: 'BPHS ch. 4; Phaladīpikā ch. 1',
  },
  {
    index: 10,
    name: 'Aquarius',
    sanskrit: 'Kumbha',
    plain: 'Kumbha',
    lord: 'Saturn',
    modality: 'fixed',
    element: 'air',
    summary:
      'Fixed air, ruled by Saturn — settled principle, groups, and distance from the personal.',
    keywords: ['groups', 'systems', 'detachment', 'principle', 'the ankles'],
    body: [
      'Fixed air: ideas that hold their shape. Kumbha is the sign of the collective and the systemic — a graha here operates at a remove from personal interest, which reads as fairness or as coldness depending on the rest of the chart.',
      'Saturn rules it, and this is Saturn’s more sociable house. The Sun is in its sign of debility’s opposite here in practice — a person with strong Kumbha placements often works better for a cause than for their own advancement.',
    ],
    source: 'BPHS ch. 4; Sārāvalī ch. 3',
  },
  {
    index: 11,
    name: 'Pisces',
    sanskrit: 'Mīna',
    plain: 'Mina',
    lord: 'Jupiter',
    modality: 'dual',
    element: 'water',
    summary: 'Dual water, ruled by Jupiter — dissolution, compassion, and the end of the cycle.',
    keywords: ['compassion', 'imagination', 'dissolution', 'retreat', 'liberation', 'the feet'],
    body: [
      'Dual water, and the last sign — the place where distinctions dissolve. Mīna is the medium of imagination, of compassion, and of the loss of hard edges, for better and worse.',
      'Jupiter rules it and Venus is exalted here, which makes it the most naturally benefic sign in the zodiac. Mercury is debilitated: precise categorisation is exactly what this medium is least good at.',
    ],
    source: 'BPHS ch. 4; Phaladīpikā ch. 1',
  },
];

export function signSignification(index: number): SignSignification | undefined {
  return SIGNS_LIB.find((entry) => entry.index === index);
}

export function signByName(name: string): SignSignification | undefined {
  return SIGNS_LIB.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
}
