/**
 * The authorities a reading may rest on, and what may be done with each.
 *
 * ## Why this is a table and not a habit
 *
 * Jade quotes astrologers who wrote between the second century and the
 * seventeenth. Their words are out of copyright; the *translations* almost all
 * are not. Robbins on Ptolemy, Pingree on Dorotheus, Dykes on Bonatti and Abū
 * Maʿshar, Santhanam on Parāśara — those are living works of scholarship owned
 * by their translators and publishers, and a paragraph lifted from one is an
 * infringement no matter how old the underlying author is.
 *
 * Two texts escape that, and only two: Lilly wrote *Christian Astrology* in
 * English in 1647, and Ashmand's *Tetrabiblos* of 1822 is long out of term.
 * Those may be quoted. Everything else is paraphrase — the doctrine restated in
 * Jade's own words, with the book and chapter named so a reader can go and
 * check.
 *
 * So `quotable` is a legal fact about a specific edition, recorded once, and
 * `traditionSource` is the only way a passage gets attribution. A writer adding
 * a voice cannot accidentally quote Dykes, because there is nowhere to put the
 * quotation.
 *
 * ## Medical astrology
 *
 * Culpeper and the decumbiture tradition are here because the history is real
 * and a reader asking about it deserves an honest answer. They are flagged
 * `historyOnly`, and `traditions.test.ts` fails if a reading passage cites one.
 * CLAUDE.md #6 is not a tone preference: Jade does not tell a person what their
 * chart says about their health, and the way to keep that true is to make the
 * citation impossible rather than to remember not to write it.
 */

export type TraditionId = 'hellenistic' | 'perso-arabic' | 'medieval' | 'renaissance' | 'jyotisha';

export interface Tradition {
  readonly id: TraditionId;
  /** What to call it on screen. */
  readonly name: string;
  readonly when: string;
  readonly where: string;
  /**
   * How this tradition reasons — one sentence, shown once at the top of a
   * column rather than repeated in every passage beneath it.
   */
  readonly temper: string;
}

export const TRADITIONS: readonly Tradition[] = [
  {
    id: 'hellenistic',
    name: 'Hellenistic',
    when: '2nd century BCE – 6th century CE',
    where: 'Alexandria, and the Greek-speaking Mediterranean',
    temper:
      'Reads a chart as a shape: which planets can see each other, which are awake by day or by night, which arrived in a place that welcomes them. Concrete, fatalistic in register, and far more interested in the condition of a planet than in its symbolism.',
  },
  {
    id: 'perso-arabic',
    name: 'Perso-Arabic',
    when: '8th – 11th century',
    where: 'Baghdad, Balkh, Khwārazm',
    temper:
      'Inherited the Greek and Persian material and systematised it — degrees of dignity scored, aspects weighed by applying and separating, every judgement built up from parts that can be named. The most procedural of the five.',
  },
  {
    id: 'medieval',
    name: 'Medieval Latin',
    when: '12th – 15th century',
    where: 'Toledo, Bologna, Paris',
    temper:
      'The Arabic corpus translated into Latin and taught in universities. Rule-bound, argumentative, and attentive to exactly how strong a testimony is before it is allowed to decide anything.',
  },
  {
    id: 'renaissance',
    name: 'Renaissance & early modern',
    when: '16th – 17th century',
    where: 'Nuremberg, Paris, London',
    temper:
      'Writes in the vernacular for working practitioners, with case material and an eye on what actually happened. The first tradition to argue in public about whether its own rules hold up.',
  },
  {
    id: 'jyotisha',
    name: 'Jyotiṣa',
    when: 'from the early centuries CE, continuously',
    where: 'the Indian subcontinent',
    temper:
      'The only one of the five never to break its transmission. Reads from a sidereal zodiac and organises time by period rather than by transit alone, so a transit is always read against the period it falls inside.',
  },
];

export interface Source {
  readonly id: string;
  readonly author: string;
  /** The work, in the language it was written in. */
  readonly work: string;
  /** How Jade prints the title in running text. */
  readonly shortTitle: string;
  readonly tradition: TraditionId;
  readonly floruit: string;
  readonly language: string;
  /**
   * True only where an English text of this work is itself in the public
   * domain, which means the *translation* as well as the original. Two are.
   */
  readonly quotable: boolean;
  /** Set on the medical tradition. Never cited by a reading — see the header. */
  readonly historyOnly?: boolean;
  /** Why this author is worth naming, in one line. */
  readonly why: string;
}

export const SOURCES: readonly Source[] = [
  {
    id: 'ptolemy',
    author: 'Claudius Ptolemy',
    work: 'Τετράβιβλος',
    shortTitle: 'Tetrabiblos',
    tradition: 'hellenistic',
    floruit: 'c. 100 – c. 170 CE',
    language: 'Greek',
    quotable: true,
    why: 'The text that made astrology defensible to natural philosophers, and the one every later tradition argues with.',
  },
  {
    id: 'valens',
    author: 'Vettius Valens',
    work: 'Ἀνθολογίαι',
    shortTitle: 'the Anthology',
    tradition: 'hellenistic',
    floruit: 'c. 120 – c. 175 CE',
    language: 'Greek',
    quotable: false,
    why: 'A working astrologer rather than a theorist — over a hundred worked charts, and the bluntest surviving Hellenistic voice.',
  },
  {
    id: 'dorotheus',
    author: 'Dorotheus of Sidon',
    work: 'Carmen Astrologicum',
    shortTitle: 'the Carmen',
    tradition: 'hellenistic',
    floruit: '1st century CE',
    language: 'Greek, surviving through Arabic',
    quotable: false,
    why: 'Written in verse, transmitted through Persian and Arabic, and the direct ancestor of most medieval technique.',
  },
  {
    id: 'firmicus',
    author: 'Julius Firmicus Maternus',
    work: 'Matheseos Libri VIII',
    shortTitle: 'the Mathesis',
    tradition: 'hellenistic',
    floruit: 'c. 334 – 337 CE',
    language: 'Latin',
    quotable: false,
    why: 'The fullest Latin statement of Hellenistic doctrine, and unusually explicit about what a placement is like to live with.',
  },
  {
    id: 'abu-mashar',
    author: 'Abū Maʿshar al-Balkhī',
    work: 'Kitāb al-Madkhal al-Kabīr',
    shortTitle: 'the Great Introduction',
    tradition: 'perso-arabic',
    floruit: '787 – 886',
    language: 'Arabic',
    quotable: false,
    why: 'Turned inherited doctrine into a reasoned system, and through its Latin translation set the terms for four centuries of European astrology.',
  },
  {
    id: 'masha-allah',
    author: 'Māshāʾallāh ibn Atharī',
    work: 'On Reception, and the astrological works',
    shortTitle: 'Māshāʾallāh',
    tradition: 'perso-arabic',
    floruit: 'c. 740 – 815',
    language: 'Arabic',
    quotable: false,
    why: 'The clearest early writer on reception — what it means when two planets are in each other’s places rather than merely looking at each other.',
  },
  {
    id: 'al-biruni',
    author: 'Abū Rayḥān al-Bīrūnī',
    work: 'Kitāb al-Tafhīm',
    shortTitle: 'the Tafhīm',
    tradition: 'perso-arabic',
    floruit: '973 – 1048',
    language: 'Arabic',
    quotable: false,
    why: 'A sceptic writing a textbook: states each doctrine precisely and then says which authorities disagree, which is why it is the best single index of the tradition.',
  },
  {
    id: 'bonatti',
    author: 'Guido Bonatti',
    work: 'Liber Astronomiae',
    shortTitle: 'the Liber Astronomiae',
    tradition: 'medieval',
    floruit: 'c. 1210 – c. 1296',
    language: 'Latin',
    quotable: false,
    why: 'The medieval encyclopaedia — the Arabic material argued through by a man who was using it professionally in Italian city politics.',
  },
  {
    id: 'morin',
    author: 'Jean-Baptiste Morin',
    work: 'Astrologia Gallica',
    shortTitle: 'Astrologia Gallica',
    tradition: 'renaissance',
    floruit: '1583 – 1656',
    language: 'Latin',
    quotable: false,
    why: 'Tried to rebuild astrology from first principles, and threw out most of the received rules on the way — the most sceptical major author in the corpus.',
  },
  {
    id: 'lilly',
    author: 'William Lilly',
    work: 'Christian Astrology',
    shortTitle: 'Christian Astrology',
    tradition: 'renaissance',
    floruit: '1602 – 1681',
    language: 'English',
    quotable: true,
    why: 'Written in English for English practitioners, with the reasoning shown. The one major classical text a modern reader can simply read.',
  },
  {
    id: 'parashara',
    author: 'Parāśara',
    work: 'Bṛhat Parāśara Horā Śāstra',
    shortTitle: 'the Bṛhat Parāśara Horā Śāstra',
    tradition: 'jyotisha',
    floruit: 'compiled over centuries; received form by c. 8th century',
    language: 'Sanskrit',
    quotable: false,
    why: 'The reference work of the dominant school — house lordship, the daśā system, and the yogas as most Jyotiṣīs learn them.',
  },
  {
    id: 'varahamihira',
    author: 'Varāhamihira',
    work: 'Bṛhat Jātaka',
    shortTitle: 'the Bṛhat Jātaka',
    tradition: 'jyotisha',
    floruit: 'c. 505 – 587',
    language: 'Sanskrit',
    quotable: false,
    why: 'Terse, early, and openly aware of the Greek material — the place where the two traditions can be seen touching.',
  },
  {
    id: 'kalyanavarma',
    author: 'Kalyāṇavarma',
    work: 'Sārāvalī',
    shortTitle: 'the Sārāvalī',
    tradition: 'jyotisha',
    floruit: 'c. 9th century',
    language: 'Sanskrit',
    quotable: false,
    why: 'The fullest classical treatment of planets in signs and houses, placement by placement.',
  },
  {
    id: 'culpeper',
    author: 'Nicholas Culpeper',
    work: 'Astrologicall Judgement of Diseases',
    shortTitle: 'Astrologicall Judgement of Diseases',
    tradition: 'renaissance',
    floruit: '1616 – 1654',
    language: 'English',
    quotable: true,
    historyOnly: true,
    why: 'The best-known English text on decumbiture — casting a chart for the moment someone took to their bed. Jade teaches the history and never applies it.',
  },
];

const BY_ID = new Map(SOURCES.map((source) => [source.id, source]));

export function sourceById(id: string): Source | undefined {
  return BY_ID.get(id);
}

export function traditionById(id: TraditionId): Tradition {
  return TRADITIONS.find((one) => one.id === id)!;
}

/**
 * How a passage names the authority it rests on.
 *
 * Deliberately not "Ptolemy, Tetrabiblos II.9, trans. Robbins p. 191". A
 * reading is not a critical edition, and a citation dense enough to be one is a
 * citation nobody reads. Author, work, and the division of the work — enough to
 * find the passage in any edition, in any language, which is also the form that
 * survives the translation problem in the header.
 */
export function citation(sourceId: string, locus?: string): string {
  const source = sourceById(sourceId);
  if (!source) return '';
  return locus
    ? `${source.author}, ${source.shortTitle} ${locus}`
    : `${source.author}, ${source.shortTitle}`;
}
