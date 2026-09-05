/**
 * What the words mean.
 *
 * Jyotiṣa has a large technical vocabulary and most of it is Sanskrit, which
 * puts a real wall in front of anyone learning. Jade's answer everywhere else
 * is to show its working; this is the same principle applied to its own
 * language — no term appears in the interface that a reader cannot interrogate
 * where they meet it.
 *
 * ## What makes an entry good
 *
 * The temptation is a dictionary: "Nakṣatra — lunar mansion." That is true,
 * useless, and indistinguishable from every other astrology glossary on the
 * internet. An entry here has to do three things a dictionary does not:
 *
 *  1. **Say what it is literally.** Sanskrit compounds are usually
 *     transparent once broken open — `ṣaḍbala` is simply "six strengths" —
 *     and knowing that is worth more than a paraphrase.
 *  2. **Say what it does in practice.** Not the definition but the use: what
 *     question a practitioner reaches for it to answer.
 *  3. **Point at its neighbours.** Terms in this system are not a flat list;
 *     they are a structure. A nakṣatra has a lord, the lord orders the
 *     Vimśottarī daśā, the daśā is read against transits. Following that
 *     chain is how the subject is actually learned, so every entry names the
 *     terms it touches and the interface makes them reachable.
 *
 * The third point is the one that stops this feeling generic. A reader who
 * hovers `nakṣatra` and finds `vimśottarī` waiting one step away is being
 * shown the shape of the subject, not handed a card.
 */

export interface GlossaryEntry {
  readonly id: string;
  /** IAST, as it appears in the interface. */
  readonly term: string;
  /** Plain transliteration, always offered beside it. */
  readonly plain: string;
  /** What the Sanskrit literally says, where it is transparent. */
  readonly literal?: string;
  /** One line. What shows first. */
  readonly short: string;
  /** A paragraph: what it does, and what a practitioner uses it for. */
  readonly body: string;
  /** Ids of terms this one touches. Rendered as the way onward. */
  readonly related: readonly string[];
  /** Where in Jade you meet it. */
  readonly whereInJade?: string;
}

const E = (entry: GlossaryEntry): GlossaryEntry => entry;

export const GLOSSARY: readonly GlossaryEntry[] = [
  // ------------------------------------------------------ the frame itself
  E({
    id: 'jyotisa',
    term: 'Jyotiṣa',
    plain: 'Jyotisha',
    literal: 'the science of light',
    short: 'Indian astrology, and the tradition Jade computes in.',
    body: 'One of the six Vedāṅgas, the limbs of Vedic learning. It differs from Western astrology in three ways that matter for reading anything in Jade: it is sidereal rather than tropical, it works from the Moon and its nakṣatra as much as from the Sun, and it has a developed system of timing — the daśās — that Western practice largely lacks.',
    related: ['sidereal', 'nakshatra', 'dasha'],
  }),
  E({
    id: 'sidereal',
    term: 'Sidereal',
    plain: 'sidereal',
    literal: 'of the stars',
    short: 'Measured against the fixed stars rather than the equinox.',
    body: 'The equinox drifts backwards through the constellations by about a degree every seventy-two years. Western astrology measures from the moving equinox; Jyotiṣa measures from the stars themselves. The gap between the two is currently about 24° — nearly a whole sign — which is why your Western Sun sign and your Vedic one usually differ. The size of that gap is the ayanāṁśa.',
    related: ['ayanamsa', 'jyotisa'],
  }),
  E({
    id: 'ayanamsa',
    term: 'Ayanāṁśa',
    plain: 'ayanamsha',
    literal: 'the portion of the solstice',
    short: 'How far the equinox has drifted from the fixed stars.',
    body: 'A single number, currently about 24°, subtracted from a tropical position to get a sidereal one. Astrologers disagree about its exact value because they disagree about where the sidereal zodiac begins, and the common choices — Lahiri, Raman, Krishnamurti — differ by up to a degree. That is enough to move a graha across a sign boundary, so every chart in Jade records which one produced it.',
    related: ['sidereal'],
    whereInJade: 'Stated on every chart, and chosen in Settings.',
  }),

  // -------------------------------------------------------- the chart parts
  E({
    id: 'lagna',
    term: 'Lagna',
    plain: 'lagna',
    literal: 'that which is attached',
    short: 'The rising sign — the degree of the zodiac on the eastern horizon at birth.',
    body: 'The whole chart is counted from here: the lagna is the first house, and every other house follows it. It moves about a degree every four minutes, which is why the birth time matters so much more than the birth date. An hour of uncertainty can move it a whole sign and renumber every house in the chart.',
    related: ['bhava', 'rasi', 'rectification'],
    whereInJade: 'The first thing on any chart page, and what the wheel is oriented to.',
  }),
  E({
    id: 'rasi',
    term: 'Rāśi',
    plain: 'rashi',
    literal: 'a heap',
    short: 'A sign of the zodiac — one of twelve 30° divisions.',
    body: 'The same twelve signs Western astrology uses, measured sidereally. Each is ruled by a graha, has an element and a mode, and lends its character to whatever stands in it. In Jyotiṣa the rāśi chart — the plain birth chart — is only the first of sixteen; the vargas divide each sign further.',
    related: ['varga', 'graha', 'bhava'],
  }),
  E({
    id: 'bhava',
    term: 'Bhāva',
    plain: 'bhava',
    literal: 'a becoming, a state',
    short: 'A house — one of twelve areas of life, counted from the lagna.',
    body: 'Where a rāśi is a division of the zodiac, a bhāva is a division of a life: the first is the body and self, the seventh partnership, the tenth work. Jade counts them whole-sign by default, meaning house one is the entire rising sign — the oldest and most widely used method in Jyotiṣa, and not the same as the Western house systems.',
    related: ['lagna', 'rasi', 'kendra', 'dusthana'],
  }),
  E({
    id: 'graha',
    term: 'Graha',
    plain: 'graha',
    literal: 'one who seizes',
    short: 'A planet — but the word means "seizer", not "wanderer".',
    body: 'Nine of them: the Sun and Moon, five visible planets, and the two lunar nodes Rāhu and Ketu. The name is worth knowing: where the Greek planētēs means wanderer, graha means one that takes hold. The tradition treats them as agents acting on a life rather than markers moving through a sky.',
    related: ['rahu', 'dignity', 'drishti'],
  }),

  // ------------------------------------------------------------ nakṣatra
  E({
    id: 'nakshatra',
    term: 'Nakṣatra',
    plain: 'nakshatra',
    literal: 'that which does not decay',
    short: 'One of 27 lunar mansions, each 13°20′ of the zodiac.',
    body: 'The Moon crosses roughly one a day, and the nakṣatra it occupies at birth is read as closely as the sign — often more closely. Each has a ruling graha, and that lord is what orders the Vimśottarī daśā, so the nakṣatra of the Moon at birth decides the entire timing structure of the life. This is the single most important thing Jyotiṣa has that Western astrology does not.',
    related: ['pada', 'vimshottari', 'dasha'],
    whereInJade: 'On every graha row, and in the glance at the top of a chart.',
  }),
  E({
    id: 'pada',
    term: 'Pāda',
    plain: 'pada',
    literal: 'a foot, a quarter',
    short: 'A quarter of a nakṣatra — 3°20′.',
    body: 'Each nakṣatra divides into four pādas, and the pāda a graha falls in decides its navāṁśa sign. So the pāda is the bridge between the lunar and the divisional systems: it is how a position in the 27-fold scheme becomes a position in the 9-fold one.',
    related: ['nakshatra', 'navamsa'],
  }),

  // --------------------------------------------------------------- timing
  E({
    id: 'dasha',
    term: 'Daśā',
    plain: 'dasha',
    literal: 'a state or condition',
    short: 'A period of time ruled by one graha.',
    body: 'Jyotiṣa’s answer to "when". Life is divided into stretches, each governed by a graha, and what that graha means in the chart is what the period is read to be about. Periods nest: a mahādaśā of nineteen years contains antardaśās of months, which contain pratyantardaśās of days. Jade computes five levels.',
    related: ['vimshottari', 'mahadasha', 'nakshatra'],
    whereInJade: 'The daśā column on a chart, and the running chain on Home.',
  }),
  E({
    id: 'vimshottari',
    term: 'Vimśottarī',
    plain: 'vimshottari',
    literal: 'one hundred and twenty',
    short: 'The standard daśā system, a cycle of 120 years.',
    body: 'Nine grahas share 120 years in fixed unequal portions — Venus gets twenty, the Sun six. Where you enter the cycle is decided by the nakṣatra the Moon occupied at birth, and how far through that nakṣatra it had travelled sets how much of the first period had already elapsed. That is why an accurate birth time matters twice over: once for the lagna, once for the daśā balance.',
    related: ['dasha', 'nakshatra', 'mahadasha'],
  }),
  E({
    id: 'mahadasha',
    term: 'Mahādaśā',
    plain: 'mahadasha',
    literal: 'great period',
    short: 'The outermost daśā level, six to twenty years long.',
    body: 'The broad season of a life. Within it the antardaśā (sub-period) shades the reading, and within that the pratyantardaśā narrows it further. A practitioner usually reads the innermost two for a consultation and the mahādaśā for the shape of the decade.',
    related: ['dasha', 'vimshottari'],
  }),
  E({
    id: 'gochara',
    term: 'Gochara',
    plain: 'gochara',
    literal: 'moving on the earth',
    short: 'Transit — where the grahas are now, against where they were at birth.',
    body: 'The other half of timing. A daśā says which graha is speaking; a transit says whether the sky is currently supporting it. Slow transits matter most — Saturn takes two and a half years to cross a sign, and its contacts to natal points are the dates practitioners actually write down.',
    related: ['dasha', 'ashtakavarga'],
  }),

  // -------------------------------------------------------------- divisions
  E({
    id: 'varga',
    term: 'Varga',
    plain: 'varga',
    literal: 'a division, a class',
    short: 'A divisional chart — each sign cut into finer parts.',
    body: 'A varga divides every sign by some number and reassigns the pieces to signs, producing a second chart from the same moment. Each is read for a particular department of life: the navāṁśa for marriage and inner strength, the daśāṁśa for career. A graha strong in the rāśi but weak across the vargas is read as promising more than it delivers.',
    related: ['navamsa', 'shodashavarga', 'vargottama'],
  }),
  E({
    id: 'navamsa',
    term: 'Navāṁśa',
    plain: 'navamsha',
    literal: 'ninth part',
    short: 'The ninth-division chart — the most important varga after the birth chart itself.',
    body: 'Each sign is cut into nine parts of 3°20′, which is exactly one pāda of a nakṣatra. Traditionally read for marriage and for the underlying strength of a graha: a graha that looks well placed in the rāśi but falls badly in the navāṁśa is regarded as weaker than it appears. Many practitioners read the two charts side by side as a matter of course.',
    related: ['varga', 'pada', 'vargottama'],
  }),
  E({
    id: 'shodashavarga',
    term: 'Ṣoḍaśavarga',
    plain: 'shodashavarga',
    literal: 'the sixteen divisions',
    short: 'The full set of sixteen divisional charts.',
    body: 'From the rāśi (D1) down to the ṣaṣṭyāṁśa (D60), each dividing the zodiac more finely than the last. Few practitioners read all sixteen for every chart, but the set is the standard against which software is judged — and most Western-built astrology tools have none of it at all.',
    related: ['varga', 'navamsa'],
    whereInJade: 'All sixteen, on every chart, on the free tier.',
  }),
  E({
    id: 'vargottama',
    term: 'Vargottama',
    plain: 'vargottama',
    literal: 'best in division',
    short: 'A graha occupying the same sign in the rāśi and the navāṁśa.',
    body: 'Read as a marked strengthening: what the graha promises in the birth chart it also delivers in the ninth division, so the two do not contradict each other. One of the few conditions on which the tradition is more or less unanimous.',
    related: ['navamsa', 'varga', 'dignity'],
  }),

  // -------------------------------------------------------------- strength
  E({
    id: 'ashtakavarga',
    term: 'Aṣṭakavarga',
    plain: 'ashtakavarga',
    literal: 'the eightfold division',
    short: 'A points system scoring every sign for every graha.',
    body: 'Each of seven grahas plus the lagna contributes benefic points — bindus — to each sign, from the point of view of each other graha. The result is a map of which parts of the zodiac are supported and which are not. It is what transit work actually reads: Saturn crossing a sign with two bindus is a different matter from Saturn crossing one with seven.',
    related: ['bindu', 'sarvashtakavarga', 'gochara'],
  }),
  E({
    id: 'bindu',
    term: 'Bindu',
    plain: 'bindu',
    literal: 'a point, a drop',
    short: 'One benefic point in the aṣṭakavarga.',
    body: 'A sign can hold between zero and eight bindus from any one graha’s table. More is read as more supportive ground. The count is arithmetic, not interpretive — which is precisely why it is useful: two astrologers who disagree about everything else will agree on the number.',
    related: ['ashtakavarga', 'sarvashtakavarga'],
  }),
  E({
    id: 'sarvashtakavarga',
    term: 'Sarvāṣṭakavarga',
    plain: 'sarvashtakavarga',
    literal: 'the whole eightfold division',
    short: 'The seven graha tables summed — one figure per sign, totalling 337.',
    body: 'The overview: which signs in this chart are best supported overall. Practitioners use it to decide where a transit will land well and where it will not, and to compare houses at a glance without reading seven tables.',
    related: ['ashtakavarga', 'bindu'],
  }),
  E({
    id: 'shadbala',
    term: 'Ṣaḍbala',
    plain: 'shadbala',
    literal: 'six strengths',
    short: 'Six separate measures of a graha’s strength.',
    body: 'Positional, directional, temporal, motional, natural and aspectual strength, each computed differently. Jade reports the six components and deliberately does not sum them: the sources disagree about the weights, so a single total would be a number with a false air of authority. The components are what the tradition actually argues from.',
    related: ['dignity', 'graha'],
  }),
  E({
    id: 'dignity',
    term: 'Dignity',
    plain: 'dignity',
    short: 'How comfortable a graha is in the sign it occupies.',
    body: 'Exalted at its best, debilitated at its worst, with own-sign and mūlatrikoṇa between. A graha in dignity acts freely; one in debilitation is read as acting under constraint rather than as simply bad. The scheme is fixed and ancient — Jupiter is always exalted in Cancer — so it is one of the few things in a chart that requires no judgement to read.',
    related: ['graha', 'combustion', 'vargottama'],
  }),
  E({
    id: 'combustion',
    term: 'Combustion',
    plain: 'combustion',
    short: 'A graha too close to the Sun to be seen.',
    body: 'Within a few degrees of the Sun a graha is lost in its light, and the tradition reads it as having its own agenda overwhelmed. The orb differs by graha. Within about a degree the condition inverts and becomes cazimi — "in the heart" — which is read as a strengthening rather than a burning.',
    related: ['dignity', 'graha'],
  }),

  // ------------------------------------------------------------ combinations
  E({
    id: 'yoga',
    term: 'Yoga',
    plain: 'yoga',
    literal: 'a joining',
    short: 'A named combination of placements with a recognised meaning.',
    body: 'Not the physical practice — the same root, but here it means a conjunction of conditions. Hundreds are named in the literature. What matters as much as the yoga is its cancellation: many are formed technically and then blunted by another placement, and a yoga reported without its cancellations is astrologically dishonest. Jade always shows both.',
    related: ['graha', 'bhava', 'drishti'],
    whereInJade: 'Nineteen yogas, each naming the placements that formed it.',
  }),
  E({
    id: 'drishti',
    term: 'Dṛṣṭi',
    plain: 'drishti',
    literal: 'a glance, a gaze',
    short: 'Aspect — where a graha casts its attention.',
    body: 'Every graha aspects the seventh sign from itself. Mars additionally aspects the fourth and eighth, Jupiter the fifth and ninth, Saturn the third and tenth. Note that Vedic aspect is by whole sign rather than by degree, which means it is a standing condition lasting as long as the graha is in the sign — not a passing event with an orb.',
    related: ['graha', 'rasi', 'yoga'],
  }),
  E({
    id: 'kendra',
    term: 'Kendra',
    plain: 'kendra',
    literal: 'centre',
    short: 'The angular houses — 1, 4, 7 and 10.',
    body: 'The pillars of a chart. A graha in a kendra is read as having a platform to act from, and the classical rule that benefics in kendras strengthen a chart is one of the oldest in the literature. The trines — 1, 5 and 9 — are the koṇas, and a graha ruling both a kendra and a koṇa is especially well regarded.',
    related: ['bhava', 'dusthana'],
  }),
  E({
    id: 'dusthana',
    term: 'Duḥsthāna',
    plain: 'dusthana',
    literal: 'a bad place',
    short: 'The difficult houses — 6, 8 and 12.',
    body: 'Read as the houses of struggle, disruption and loss respectively. The nuance the tradition insists on is that difficulty is not disaster: the sixth is also the house of overcoming, and a strong graha there can indicate someone who wins fights. Jade will not tell you a duḥsthāna means something bad will happen, and never predicts illness or death.',
    related: ['bhava', 'kendra'],
  }),

  // ---------------------------------------------------------------- the day
  E({
    id: 'panchanga',
    term: 'Pañcāṅga',
    plain: 'panchanga',
    literal: 'five limbs',
    short: 'The five measures of a day: tithi, vāra, nakṣatra, yoga and karaṇa.',
    body: 'The Indian almanac in five numbers, and the basis of choosing auspicious times. It is a description of the day itself rather than of a person, which is why Jade shows it beside a chart rather than inside one.',
    related: ['tithi', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'tithi',
    term: 'Tithi',
    plain: 'tithi',
    short: 'A lunar day — the Moon gaining 12° on the Sun.',
    body: 'Thirty in a lunar month, fifteen waxing and fifteen waning. Because the Moon’s speed varies, a tithi runs anywhere from about nineteen to about twenty-six hours, so it drifts against the solar day rather than matching it. Festivals and observances are set by tithi, not by date.',
    related: ['panchanga', 'nakshatra'],
  }),
  E({
    id: 'muhurta',
    term: 'Muhūrta',
    plain: 'muhurta',
    literal: 'a moment',
    short: 'Choosing an auspicious time to begin something.',
    body: 'Electional astrology: rather than reading a chart already fixed, you search for a moment whose chart suits the undertaking. A distinct discipline with its own rules, and one practitioners charge separately for.',
    related: ['panchanga', 'tarabala'],
  }),
  E({
    id: 'tarabala',
    term: 'Tārā bala',
    plain: 'tara bala',
    literal: 'star strength',
    short: 'The favourability of a day, counted from the Moon’s nakṣatra at birth.',
    body: 'Count from your birth nakṣatra to the one the Moon occupies today; the count, modulo nine, names a tārā — Janma, Sampat, Vipat and so on — and each carries a traditional judgement about undertakings. Jade uses it, with candra bala, for the coloured week. It is a statement about the suitability of *starting things*, not a forecast of the day.',
    related: ['nakshatra', 'muhurta', 'panchanga'],
  }),

  // --------------------------------------------------------------- the nodes
  E({
    id: 'rahu',
    term: 'Rāhu and Ketu',
    plain: 'Rahu, Ketu',
    short: 'The lunar nodes — where the Moon’s path crosses the Sun’s.',
    body: 'Not bodies but points, always exactly opposite each other, and always moving backwards through the zodiac. They are where eclipses happen, which is the whole of the mythology: the severed head and body of the being that swallows the luminaries. Jyotiṣa counts them among the nine grahas and reads them heavily; Western astrology traditionally does much less with them.',
    related: ['graha', 'nakshatra'],
  }),

  // --------------------------------------------------------------- practice
  E({
    id: 'rectification',
    term: 'Rectification',
    plain: 'rectification',
    short: 'Working backwards from events to find an uncertain birth time.',
    body: 'The lagna moves a degree every four minutes, so a chart with an uncertain time has an uncertain first house and therefore uncertain everything. Rectification sweeps candidate times and scores each against dated events in the life. It is inference, not measurement — a rectified time is a best reading of the evidence and should be recorded as one.',
    related: ['lagna', 'rodden'],
    whereInJade: 'The rectification workspace, which reports which rules actually did the ranking.',
  }),
  E({
    id: 'rodden',
    term: 'Rodden rating',
    plain: 'Rodden rating',
    short: 'A scale for how well a birth time is attested.',
    body: 'AA means a birth certificate or register; A means the person or family; B a biography; C means no source at all; DD means the sources conflict. X means no time is recorded. Named for Lois Rodden, who insisted astrologers say where their data came from. Most famous charts in circulation are far weaker than they look.',
    related: ['rectification', 'lagna'],
    whereInJade: 'On every chart in the public library.',
  }),
  E({
    id: 'jataka',
    term: 'Jātaka',
    plain: 'jataka',
    literal: 'born, of birth',
    short: 'Natal astrology — the chart of a birth, and the branch that reads it.',
    body: 'The largest branch of Jyotiṣa and the one most people mean by the word. Its counterparts are muhūrta for electing times and praśna for answering a question from the moment it is asked.',
    related: ['lagna', 'muhurta'],
  }),
];

const BY_ID = new Map(GLOSSARY.map((entry) => [entry.id, entry]));

export function glossaryEntry(id: string): GlossaryEntry | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Find an entry by the word as written.
 *
 * Case- and diacritic-insensitive, so `Nakṣatra`, `nakshatra` and `NAKSATRA`
 * all resolve. Interfaces spell these words several ways depending on who
 * wrote the label, and a glossary that only matched one spelling would be
 * silently absent from half the places it is needed.
 */
export function glossaryLookup(word: string): GlossaryEntry | null {
  const key = normalise(word);
  for (const entry of GLOSSARY) {
    if (normalise(entry.term) === key || normalise(entry.plain) === key || entry.id === key) {
      return entry;
    }
  }
  return null;
}

function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-̣̱ͯ̄]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}
