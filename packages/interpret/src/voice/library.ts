/**
 * The plain-voice text library.
 *
 * ## What this is, and what it is not
 *
 * `significations/` is written for somebody who already knows the vocabulary:
 * it says a house is a kendra and a māraka and leaves the reader to know what
 * that costs. This file says the same things to somebody who has never read a
 * Jyotiṣa book, and it is a *second register*, not a replacement. Both describe
 * the same twelve houses and nine grahas, and a test asserts they cover exactly
 * the same ground, because the moment the friendly version and the technical
 * version disagree, one of them is lying to somebody.
 *
 * ## Why components rather than combinations
 *
 * The obvious way to write an interpretation library is a paragraph per
 * combination. Twelve house lords times twelve destinations is 144 before
 * dignity, occupancy or aspect — several thousand paragraphs, of which any
 * given chart uses twelve. Nobody finishes writing that, and the parts that do
 * get written go stale unevenly.
 *
 * So this file holds **components** — what each house is, how each graha
 * behaves, what each dignity does to it, and what each *shape* of connection
 * between two houses means — and `plainReading.ts` composes them. Thirty-six
 * written blocks cover every chart, and improving one block improves every
 * reading that uses it.
 *
 * ## Rules for anything added here
 *
 * 1. Second person. The reader is being told about their own life.
 * 2. No Sanskrit without an immediate gloss.
 * 3. Concrete over mystical. "Money you earn yourself", not "the axis of value".
 * 4. **No prediction of death, illness, or legal outcome** — the sixth, eighth
 *    and twelfth houses are written in terms of what they are like to live,
 *    never as a forecast. This holds on the reading subdomain exactly as it
 *    holds everywhere else, and a test enforces it.
 * 5. Nothing here asserts a placement. These are the words; the chart supplies
 *    the facts, and `plainReading.ts` keeps the two apart.
 */

export interface HouseVoice {
  readonly house: number;
  /** What to call it when not saying "the seventh". */
  readonly plainName: string;
  /** One sentence: what this part of life is. */
  readonly is: string;
  /** The question a person actually arrives with. */
  readonly asks: string;
  /** Said when nothing occupies it — eight of twelve usually are. */
  readonly whenEmpty: string;
  /** Said when several grahas crowd in. */
  readonly whenBusy: string;
}

export const HOUSE_VOICE: readonly HouseVoice[] = [
  {
    house: 1,
    plainName: 'you, and the body you move through the world in',
    is: 'This is the house of the self — your constitution, your temperament, the impression you make before you have said anything.',
    asks: 'Who am I, and why do people read me the way they do?',
    whenEmpty:
      'Nothing sits here, which is common and says nothing against you. It means your character is read from the sign rising and from wherever its ruler went, rather than from a planet camped on your doorstep.',
    whenBusy:
      'Several planets sit in the house of the self, which tends to make a person unmistakable. It also means a lot of your chart is pointed at you rather than outward.',
  },
  {
    house: 2,
    plainName: 'what you hold — money, family, and your own voice',
    is: 'This is what you gather and keep: earned money, possessions, the family you were born into, and speech itself.',
    asks: 'Where does my security come from, and how do I speak?',
    whenEmpty:
      'Empty, which is the usual case. What you accumulate is read from the sign here and from where its ruler has gone.',
    whenBusy:
      'A crowded second usually means resources and family are a busy subject — not necessarily easy, but rarely something you can ignore.',
  },
  {
    house: 3,
    plainName: 'nerve, siblings, and the short journeys',
    is: 'Courage, effort, your hands and your voice in use — writing, messages, skills, brothers and sisters, and the travel that is near rather than far.',
    asks: 'What am I willing to push for, and who grew up beside me?',
    whenEmpty:
      'Empty. Your initiative is read through the ruler of this sign rather than through anything parked here.',
    whenBusy:
      'A busy third points at someone who does a great deal — communication, siblings and sheer effort are a running theme.',
  },
  {
    house: 4,
    plainName: 'home, and the ground under you',
    is: 'The foundation: your mother, your home and land, your schooling, and the private inner comfort you return to.',
    asks: 'Where do I belong, and what does home feel like?',
    whenEmpty:
      'Empty, which is ordinary. Home and inner life are read from the ruler of this sign and where it sits.',
    whenBusy:
      'A crowded fourth puts a lot of weight on home, land and the early years — a chart where the foundation is a large part of the story.',
  },
  {
    house: 5,
    plainName: 'what comes out of you — children, creativity, and luck',
    is: 'Creation in every sense: children, romance, what you make, speculation and play, and the intelligence you were born with rather than taught.',
    asks: 'What do I make, and what am I naturally good at?',
    whenEmpty:
      'Empty, and that is the norm. Creativity and children are read through this sign’s ruler.',
    whenBusy:
      'Several planets here make creation a central thread — children, art, romance or risk, depending on which planets they are.',
  },
  {
    house: 6,
    plainName: 'the work, and what you have to get through',
    is: 'Daily labour, routine, service, the people you work for and with, competition, debt, and obstacles met head-on. It is the house of difficulty faced rather than avoided.',
    asks: 'What do I have to overcome, and how do I handle the daily grind?',
    whenEmpty:
      'Empty, which most people would call good news — though an empty sixth is neither good nor bad. Read it from the ruler.',
    whenBusy:
      'A busy sixth is a life with real friction in it. Classically this is also the house of the person who *wins* through difficulty — it is the fighter’s house as much as the sufferer’s.',
  },
  {
    house: 7,
    plainName: 'the other person',
    is: 'Marriage and partnership, business partners, contracts, negotiation, and how you meet people in the open. It sits directly opposite the first, and that opposition is the meaning: this is the not-self.',
    asks: 'Who do I pair with, and what happens to me in close company?',
    whenEmpty:
      'Empty, which is the usual case and says nothing about whether you will partner. Read it from this sign’s ruler.',
    whenBusy:
      'A crowded seventh makes partnership a defining subject — a person much shaped by who they are with.',
  },
  {
    house: 8,
    plainName: 'what is hidden, shared, and out of your hands',
    is: 'The things you do not control: other people’s money and inheritance, deep change, research and the occult, and whatever is kept out of sight. Older texts put heavier subjects here too, which Jade does not forecast and does not speculate about.',
    asks: 'What transforms me, and what am I not being shown?',
    whenEmpty:
      'Empty, which is the common case. What is hidden in your life is read through the ruler of this sign.',
    whenBusy:
      'A busy eighth tends to make someone comfortable with what other people avoid — the researcher, the person who is fine in a crisis.',
  },
  {
    house: 9,
    plainName: 'belief, teachers, and the long journeys',
    is: 'Meaning and its sources: your father, your teachers, philosophy and religion, higher study, law in the sense of principle, and travel that is genuinely far.',
    asks: 'What do I believe, and who taught me?',
    whenEmpty: 'Empty, as usual. Belief and fortune are read through this sign’s ruler.',
    whenBusy:
      'A crowded ninth is a chart much concerned with meaning — teachers, principle and distance run through it.',
  },
  {
    house: 10,
    plainName: 'the work you are known for',
    is: 'Career, standing, and public action — not what you do for money necessarily, but what you are seen to do. It is the highest point of the chart.',
    asks: 'What am I for, in the eyes of the world?',
    whenEmpty:
      'Empty, which is ordinary and no obstacle to a career. Read it from the ruler of this sign.',
    whenBusy:
      'A crowded tenth is usually a person whose public life is a large part of who they are.',
  },
  {
    house: 11,
    plainName: 'gain, friends, and what arrives',
    is: 'Income as distinct from earnings, networks and friends, elder siblings, and wishes that come good. Whatever comes to you from outside yourself.',
    asks: 'What comes to me, and who do I come up alongside?',
    whenEmpty: 'Empty, as is usual. What arrives is read through this sign’s ruler.',
    whenBusy:
      'A busy eleventh generally means gain and networks are a strong current — a well-connected chart.',
  },
  {
    house: 12,
    plainName: 'what you let go of',
    is: 'Retreat and privacy, sleep and dreams, the imagination, expenditure, foreign places, and what you give away — willingly or not. It is the house of release rather than of grasp.',
    asks: 'What do I spend, and where do I go to be unreachable?',
    whenEmpty: 'Empty, which is common. Read it from the ruler of this sign.',
    whenBusy:
      'A crowded twelfth often marks an inward person — much of their real life happens somewhere other people cannot see.',
  },
];

export interface GrahaVoice {
  readonly id: string;
  readonly plainName: string;
  /** "the part of you that…" — the temperament, in plain words. */
  readonly temperament: string;
  /** What it puts into whatever house it lands in. */
  readonly brings: string;
  /** A single verb phrase, for composing mid-sentence. */
  readonly verb: string;
  readonly whenStrong: string;
  readonly whenStrained: string;
}

export const GRAHA_VOICE: readonly GrahaVoice[] = [
  {
    id: 'Sun',
    plainName: 'the Sun',
    temperament:
      'the part of you that wants to be someone in particular — pride, spine, and the need to matter',
    brings: 'attention, authority and a certain amount of heat',
    verb: 'lights up and puts pressure on',
    whenStrong:
      'confidence here is steady rather than performed, and authority sits naturally on you.',
    whenStrained:
      'this is where pride costs you something, and where recognition is harder to come by than it should be.',
  },
  {
    id: 'Moon',
    plainName: 'the Moon',
    temperament:
      'your mind as it actually runs day to day — mood, memory, comfort and what soothes you',
    brings: 'feeling, changeability, and a need for this part of life to feel safe',
    verb: 'softens and unsettles by turns',
    whenStrong: 'your instincts here are good and your comfort is easy to find.',
    whenStrained:
      'this is where your mood is least stable, and where reassurance tends to be needed more often.',
  },
  {
    id: 'Mars',
    plainName: 'Mars',
    temperament: 'the part of you that fights, decides and does — force, appetite, and impatience',
    brings: 'drive, conflict, and a willingness to act before everything is settled',
    verb: 'drives and burns through',
    whenStrong: 'you are decisive here and can push through things that stop other people.',
    whenStrained: 'this is where you are most likely to force something that wanted patience.',
  },
  {
    id: 'Mercury',
    plainName: 'Mercury',
    temperament:
      'how you think, talk, calculate and adapt — the quick, flexible, slightly restless part',
    brings: 'intelligence, talk, commerce and a habit of turning things over',
    verb: 'sharpens and complicates',
    whenStrong: 'you are articulate and quick here, and you can talk your way through.',
    whenStrained:
      'this is where you overthink, or where what you say lands differently from how you meant it.',
  },
  {
    id: 'Jupiter',
    plainName: 'Jupiter',
    temperament:
      'the part of you that expands, believes and gives — generosity, principle, and a taste for the larger view',
    brings: 'growth, protection, teachers and good sense',
    verb: 'widens and protects',
    whenStrong: 'things here grow, and help tends to arrive when it is needed.',
    whenStrained:
      'this is where you overdo it, or where faith outruns what the situation can carry.',
  },
  {
    id: 'Venus',
    plainName: 'Venus',
    temperament:
      'what you want, enjoy and find beautiful — pleasure, taste, affection and the wish to be in accord',
    brings: 'ease, attraction, art and a strong preference for harmony',
    verb: 'sweetens and indulges',
    whenStrong: 'this part of life is pleasurable and you have real taste in it.',
    whenStrained:
      'this is where comfort is hardest to refuse, and where you may keep the peace at your own expense.',
  },
  {
    id: 'Saturn',
    plainName: 'Saturn',
    temperament:
      'the part of you that waits, endures and does not take the shortcut — patience, limitation and hard-earned competence',
    brings: 'delay, structure, and things that arrive late and then stay',
    verb: 'slows and tests',
    whenStrong:
      'what you build here is slow and genuinely durable — this is the tradition’s point about Saturn, and it is usually missed.',
    whenStrained:
      'this part of life asks more of you than it does of most people, and it asks for longer.',
  },
  {
    id: 'Rahu',
    plainName: 'Rāhu, the north node',
    temperament:
      'appetite without a limit — fascination, ambition, and a hunger for what is unfamiliar',
    brings: 'intensity, foreignness, sudden rises and a certain amount of never-enough',
    verb: 'inflames and magnifies',
    whenStrong: 'you can go much further here than your background suggests.',
    whenStrained: 'this is where wanting more never quite resolves, however much arrives.',
  },
  {
    id: 'Ketu',
    plainName: 'Ketu, the south node',
    temperament:
      'the part of you that has already had enough — detachment, old skill, and a tendency to let go',
    brings: 'expertise that feels unearned, and a strange indifference to what it is good at',
    verb: 'thins out and sharpens',
    whenStrong: 'you have an instinctive command here that you did not have to learn.',
    whenStrained: 'this is where you disengage, sometimes from things worth staying for.',
  },
];

/** What a dignity does, said plainly. Keyed by the core's `Dignity` values. */
export const DIGNITY_VOICE: Readonly<Record<string, string>> = {
  exalted: 'and it is at its very best here — this is the strongest placement the planet can have',
  moolatrikona: 'and it is close to its best here, comfortable and effective',
  own: 'and it is at home here, working without obstruction',
  great_friend: 'and it is well looked after here',
  friend: 'and it is on friendly ground',
  neutral: 'on neutral ground, neither helped nor hindered',
  enemy: 'though it is on awkward ground here',
  great_enemy: 'though this is difficult ground for it, and it works against resistance',
  debilitated:
    'though this is its weakest sign, so what it offers here comes harder and later than it would elsewhere',
};

/**
 * What a connection between two houses *shapes* like.
 *
 * The important move in this whole file. Rather than 144 paragraphs for "the
 * lord of A in B", there are a handful of relationships — a house four or ten
 * away is a pillar, five or nine away is a blessing, six eight or twelve away
 * is a hard road — and the composer picks the shape and names the two houses
 * inside it. Classical practice reads these shapes exactly this way, so this is
 * not a shortcut around the tradition; it is the tradition's own compression.
 */
export type ConnectionShape = 'own' | 'trine' | 'kendra' | 'dusthana' | 'upachaya' | 'plain';

export const CONNECTION_VOICE: Readonly<Record<ConnectionShape, string>> = {
  own: 'stays at home, which keeps this part of your life self-contained — it answers to nothing else in the chart.',
  trine:
    'goes somewhere that supports it. A trine is the tradition’s most favourable link, and it means these two parts of your life feed each other rather than compete.',
  kendra:
    'goes to one of the four pillars of the chart, so this part of your life shows up in what you actually do rather than staying private.',
  dusthana:
    'goes to one of the harder houses. That does not spell trouble — it means this part of your life is worked out through difficulty, effort or things outside your control rather than handed over easily.',
  upachaya:
    'goes to a house that improves with time. These are the placements that start awkwardly and get steadily better, which is worth knowing if you are reading this young.',
  plain: 'goes here, tying the two parts of your life together.',
};

/**
 * The shape of the link from one house to another, counted the classical way.
 *
 * Deliberately ordered: own beats everything, then trine, then dusthāna, then
 * kendra, then upachaya. A house can be several of these at once — the 10th is
 * both a kendra and an upachaya — and the tradition does not weigh them equally.
 */
export function connectionShape(from: number, to: number): ConnectionShape {
  if (from === to) return 'own';
  const distance = ((to - from + 12) % 12) + 1;
  if (distance === 5 || distance === 9) return 'trine';
  if (distance === 6 || distance === 8 || distance === 12) return 'dusthana';
  if (distance === 4 || distance === 7 || distance === 10) return 'kendra';
  if (distance === 3 || distance === 11) return 'upachaya';
  return 'plain';
}

export function houseVoice(house: number): HouseVoice | undefined {
  return HOUSE_VOICE.find((entry) => entry.house === house);
}

export function grahaVoice(id: string): GrahaVoice | undefined {
  return GRAHA_VOICE.find((entry) => entry.id === id);
}
