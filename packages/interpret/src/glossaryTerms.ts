import type { GlossaryEntry } from './glossary.js';

/**
 * The second tranche of vocabulary.
 *
 * Split from `glossary.ts` only for length — same rules, same three jobs per
 * entry (what it literally says, what it does in practice, what it touches).
 * These are the words the interface actually prints that the first pass did
 * not cover: the compatibility system, the kārakas, the remaining limbs of
 * the pañcāṅga, the house classes, and the words that appear in settings and
 * in the accuracy pages.
 */

const E = (entry: GlossaryEntry): GlossaryEntry => entry;

export const MORE_TERMS: readonly GlossaryEntry[] = [
  // ------------------------------------------------------------ timing
  E({
    id: 'antardasha',
    term: 'Antardaśā',
    plain: 'antardasha',
    literal: 'inner period',
    short: 'The sub-period inside a mahādaśā.',
    body: 'Each mahādaśā divides into nine antardaśās in the same proportions as the main cycle, so a Venus mahādaśā of twenty years opens with a Venus/Venus antardaśā of about three years and four months. The pair is what a consultation is usually read from: the mahādaśā names the theme, the antardaśā names what is happening about it now.',
    related: ['mahadasha', 'dasha', 'vimshottari'],
  }),
  E({
    id: 'pratyantardasha',
    term: 'Pratyantardaśā',
    plain: 'pratyantardasha',
    literal: 'the period next to the inner one',
    short: 'The third daśā level, running weeks to months.',
    body: 'Inside every antardaśā, nine more periods in the same proportions. This is the level at which dates start to be worth writing down, and Jade computes two further levels below it — sūkṣma and prāṇa — which are used for muhūrta-scale work rather than for reading a life.',
    related: ['antardasha', 'dasha', 'vimshottari'],
  }),
  E({
    id: 'candrabala',
    term: 'Candra bala',
    plain: 'chandra bala',
    literal: 'Moon strength',
    short: 'Whether the Moon’s current sign is favourable, counted from your natal Moon.',
    body: 'Count signs from where the Moon was at birth to where it is today. Some of the twelve counts are traditionally regarded as supportive and some are not. Read alongside tārā bala rather than instead of it — one counts by nakṣatra and the other by sign, and practitioners want both to agree before calling a day good for beginning something.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),

  // ---------------------------------------------------------- pañcāṅga
  E({
    id: 'vara',
    term: 'Vāra',
    plain: 'vara',
    literal: 'a turn, a day',
    short: 'The weekday, ruled by a graha — and it runs sunrise to sunrise.',
    body: 'Sunday is the Sun’s, Monday the Moon’s, and so on through the seven visible grahas in the order the tradition gives. The important difference from a civil weekday is where it starts: a vāra runs from sunrise, not from midnight, so the hours after midnight still belong to the previous day. Above the Arctic Circle, where there is no sunrise, Jade reports no vāra rather than guessing one.',
    related: ['panchanga', 'tithi', 'graha'],
  }),
  E({
    id: 'karana',
    term: 'Karaṇa',
    plain: 'karana',
    literal: 'a doing, an instrument',
    short: 'Half a tithi — the Moon gaining 6° on the Sun.',
    body: 'Sixty in a lunar month, drawn from a set of eleven names, of which four occur once per month and seven repeat in rotation. The fourth limb of the pañcāṅga, and the one used least in natal work — it belongs mostly to electional astrology.',
    related: ['panchanga', 'tithi', 'muhurta'],
  }),
  E({
    id: 'nityayoga',
    term: 'Nitya yoga',
    plain: 'nitya yoga',
    literal: 'daily joining',
    short: 'The Sun and Moon’s longitudes added together, cut into 27.',
    body: 'The third limb of the pañcāṅga, and a different thing entirely from the named combinations also called yogas — which is why Jade labels it "nitya" rather than leaving the word ambiguous. Twenty-seven names, changing roughly daily.',
    related: ['panchanga', 'yoga', 'tithi'],
  }),
  E({
    id: 'paksha',
    term: 'Pakṣa',
    plain: 'paksha',
    literal: 'a wing, a side',
    short: 'The lunar fortnight — waxing (śukla) or waning (kṛṣṇa).',
    body: 'Fifteen tithis each. Śukla pakṣa runs from the new Moon to the full, kṛṣṇa pakṣa back down. The distinction matters for more than bookkeeping: a waxing Moon is traditionally read as strengthening and a waning one as not, so the same Moon placement is judged differently depending which side of the month it falls on.',
    related: ['tithi', 'panchanga'],
  }),

  // ------------------------------------------------------------ kārakas
  E({
    id: 'karaka',
    term: 'Kāraka',
    plain: 'karaka',
    literal: 'the doer, the one who causes',
    short: 'A graha that signifies a matter wherever it happens to fall.',
    body: 'Independent of house. The Sun is the kāraka of the father, Venus of marriage, Jupiter of children — so a question about marriage is read from the 7th house, its lord, *and* Venus, and the tradition expects all three to be consulted before an answer. A house whose kāraka is badly placed is read as promising less than the house alone would suggest.',
    related: ['graha', 'bhava', 'atmakaraka'],
  }),
  E({
    id: 'atmakaraka',
    term: 'Ātmakāraka',
    plain: 'atmakaraka',
    literal: 'the doer of the self',
    short: 'The graha at the highest degree in the chart, whatever sign it is in.',
    body: 'Not a fixed assignment like the ordinary kārakas — it is computed from the chart, and it changes from person to person. Central to Jaimini technique, where it is read as the strongest single indicator of what a life is organised around. Degrees alone decide it, which makes it one of the few things in Jyotiṣa with no interpretive step at all.',
    related: ['karaka', 'graha', 'jataka'],
  }),

  // ------------------------------------------------- houses and classes
  E({
    id: 'trikona',
    term: 'Trikoṇa',
    plain: 'trikona',
    literal: 'triangle',
    short: 'The trines — houses 1, 5 and 9.',
    body: 'Read as the houses of merit and support, and regarded as the most favourable in the chart. A graha ruling both a trikoṇa and a kendra is a yogakāraka — one of the strongest single conditions the tradition recognises, and the reason the same graha is excellent for one ascendant and unremarkable for another.',
    related: ['bhava', 'kendra', 'yoga'],
  }),
  E({
    id: 'upachaya',
    term: 'Upachaya',
    plain: 'upachaya',
    literal: 'accumulation, growth',
    short: 'The houses that improve with time — 3, 6, 10 and 11.',
    body: 'The one place the tradition says difficulty is an asset: malefics in the upachayas are read as strengthening rather than harming, because these are the houses of effort, competition and gain, and a graha with fight in it does well there. This is why a Mars in the 6th is not read the way a Mars in the 8th is.',
    related: ['bhava', 'dusthana', 'kendra'],
  }),
  E({
    id: 'maraka',
    term: 'Māraka',
    plain: 'maraka',
    literal: 'causing to die',
    short: 'A classical label for the 2nd and 7th houses and their lords.',
    body: 'Jade names the category because it appears throughout the literature and a reader will meet the word, but it does not act on it: **nothing in Jade predicts death, illness, or how long anyone will live** (constitution #6). Modern practice generally reads these houses for sustenance and partnership and leaves the older use alone.',
    related: ['bhava', 'dusthana'],
  }),
  E({
    id: 'panaphara',
    term: 'Paṇaphara',
    plain: 'panaphara',
    literal: 'succedent',
    short: 'The houses following the kendras — 2, 5, 8 and 11.',
    body: 'The second rank of angularity. Where a kendra gives a graha a platform to act from, a paṇaphara gives it resources to act with. The remaining four — 3, 6, 9 and 12 — are the āpoklimas, the cadent houses, read as the weakest position for outward action.',
    related: ['kendra', 'bhava', 'trikona'],
  }),

  // ------------------------------------------------------- compatibility
  E({
    id: 'kuta',
    term: 'Kūṭa',
    plain: 'kuta',
    literal: 'a peak, a heap',
    short: 'One of eight tests in the classical compatibility system.',
    body: 'Each kūṭa compares one thing between two charts — mostly between the two Moons’ nakṣatras — and scores it. Varṇa, vaśya, tārā, yoni, graha maitrī, gaṇa, bhakūṭa and nāḍī, worth 1 to 8 points, totalling 36. What matters more than the total is which kūṭa failed, since they are not testing the same thing at all.',
    related: ['ashtakuta', 'nadi', 'nakshatra'],
  }),
  E({
    id: 'ashtakuta',
    term: 'Aṣṭakūṭa',
    plain: 'ashtakuta',
    literal: 'the eight peaks',
    short: 'The eight-fold compatibility score, out of 36.',
    body: 'Also called guṇa milāna. Widely used in matchmaking and widely over-read: it compares two Moons’ nakṣatras and almost nothing else, so it says nothing about the rest of either chart. Jade reports the components rather than only the total, because a 28 built on a nāḍī failure and a 28 built on a vaśya failure are not the same situation.',
    related: ['kuta', 'nadi', 'nakshatra'],
  }),
  E({
    id: 'nadi',
    term: 'Nāḍī',
    plain: 'nadi',
    literal: 'a channel, a pulse',
    short: 'The heaviest kūṭa — 8 of the 36 points.',
    body: 'Each nakṣatra belongs to one of three nāḍīs, and the tradition regards two people sharing one as the strongest objection the system raises. It is also the objection most often set aside in practice, on the grounds that a single nakṣatra-based test carries more weight here than its evidence supports.',
    related: ['kuta', 'ashtakuta', 'nakshatra'],
  }),
  E({
    id: 'dosha',
    term: 'Doṣa',
    plain: 'dosha',
    literal: 'a fault, a blemish',
    short: 'A named affliction in a chart.',
    body: 'The most discussed is maṅgala doṣa (also kuja doṣa) — Mars in certain houses from the lagna, the Moon or Venus, read as a difficulty for marriage. Its cancellations are as numerous as the rules that form it, and the sources disagree about both, so Jade always shows which rule fired and what cancelled it rather than printing a verdict.',
    related: ['yoga', 'graha', 'bhava'],
  }),

  // --------------------------------------------------------- the nine tārās
  //
  // These appear as bare words in the coloured week — "Sampat", "Vadha" — and
  // are meaningless without their count. Each says which nakṣatras it lands
  // on and what the muhūrta texts advise, and each is careful to be about
  // *beginning something* rather than about what will happen: the distinction
  // is the whole difference between a count and a forecast.
  E({
    id: 'janma',
    term: 'Janma',
    plain: 'janma',
    literal: 'birth',
    short: 'The 1st tārā — your own birth nakṣatra, and the 10th and 19th from it.',
    body: 'The count lands on your own birth star. The texts treat it as a day belonging to the self rather than to undertakings, and traditionally advise against beginning something new on it.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'sampat',
    term: 'Sampat',
    plain: 'sampat',
    literal: 'wealth, attainment',
    short: 'The 2nd tārā — the 2nd, 11th and 20th nakṣatras from your own.',
    body: 'One of the counts the muhūrta texts regard as clearly favourable, and traditionally the one chosen for anything to do with acquisition.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'vipat',
    term: 'Vipat',
    plain: 'vipat',
    literal: 'misfortune',
    short: 'The 3rd tārā — the 3rd, 12th and 21st nakṣatras from your own.',
    body: 'One of the three counts held unfavourable for beginning things. A statement about starting, not a prediction about the day — Jade prints the count and stops there.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'kshema',
    term: 'Kṣema',
    plain: 'kshema',
    literal: 'well-being, security',
    short: 'The 4th tārā — the 4th, 13th and 22nd nakṣatras from your own.',
    body: 'Favourable. Read as a settled count, chosen for consolidating something already under way rather than for launching something new.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'pratyari',
    term: 'Pratyari',
    plain: 'pratyari',
    literal: 'the opposing party',
    short: 'The 5th tārā — the 5th, 14th and 23rd nakṣatras from your own.',
    body: 'Held unfavourable for undertakings. The name means an adversary in the legal sense, and the texts read it as friction and obstruction rather than as harm.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'sadhaka',
    term: 'Sādhaka',
    plain: 'sadhaka',
    literal: 'the accomplisher',
    short: 'The 6th tārā — the 6th, 15th and 24th nakṣatras from your own.',
    body: 'Favourable, and traditionally the count chosen for work that has to be seen through to the end. The word is the same one used for a practitioner completing a discipline.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'vadha',
    term: 'Vadha',
    plain: 'vadha',
    literal: 'the strike',
    short: 'The 7th tārā — the 7th, 16th and 25th nakṣatras from your own.',
    body: 'The count the texts regard as least suited to beginning anything. Jade reports it as a count and says nothing whatever about what will happen, which is the entire difference between this and a forecast.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'mitra',
    term: 'Mitra',
    plain: 'mitra',
    literal: 'friend',
    short: 'The 8th tārā — the 8th, 17th and 26th nakṣatras from your own.',
    body: 'Favourable, and read as a supported count — particularly for anything that involves other people, which the name is doing the work of saying.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),
  E({
    id: 'atimitra',
    term: 'Ati-mitra',
    plain: 'atimitra',
    literal: 'great friend',
    short: 'The 9th tārā — the 9th, 18th and 27th nakṣatras from your own.',
    body: 'The most favourable of the nine, also called parama mitra in some sources. It completes the cycle, after which the count returns to Janma.',
    related: ['tarabala', 'nakshatra', 'muhurta'],
  }),

  // ---------------------------------------------------------- technique
  E({
    id: 'chalit',
    term: 'Chalit',
    plain: 'chalit',
    literal: 'moved, shifted',
    short:
      'The bhāva chart, where houses begin at the ascendant degree rather than at 0° of the sign.',
    body: 'Whole-sign houses make house and sign the same thing. Under any other frame they are not, and a graha in the last degrees of a sign can belong to the *next* bhāva — which changes what it is read as doing. Jade draws the chalit cusps as a second dashed set of spokes so the disagreement is visible rather than asserted.',
    related: ['bhava', 'lagna', 'rasi'],
  }),
  E({
    id: 'prashna',
    term: 'Praśna',
    plain: 'prashna',
    literal: 'a question',
    short: 'Reading the chart of the moment a question was asked.',
    body: 'The third branch, beside jātaka and muhūrta. No birth data is needed: the chart is cast for when and where the question arrived, on the principle that a question is itself an event. Its rules are its own and it is not a shortcut for a natal reading.',
    related: ['jataka', 'muhurta', 'lagna'],
  }),
  E({
    id: 'varshaphala',
    term: 'Varṣaphala',
    plain: 'varshaphala',
    literal: 'the fruit of the year',
    short: 'The annual chart, cast for the Sun’s return to its natal degree.',
    body: 'A solar return read with its own apparatus — the muntha, the year lord, and a daśā system of its own — rather than as a second natal chart. Traditionally used for the year ahead where the Vimśottarī daśā gives the decade.',
    related: ['jataka', 'dasha', 'gochara'],
  }),
  E({
    id: 'retrograde',
    term: 'Retrograde',
    plain: 'retrograde',
    literal: 'vakrī — crooked, turned back',
    short: 'A graha appearing to move backwards through the zodiac.',
    body: 'An effect of the Earth overtaking, not of the planet reversing. The Sun and Moon never do it; the nodes always do. Jyotiṣa and Western astrology disagree here in a way worth knowing: several classical sources treat retrogression as a *strengthening*, because the graha is nearer the Earth and brighter, where Western practice usually reads it as an obstruction.',
    related: ['graha', 'gochara', 'combustion'],
  }),
  E({
    id: 'moolatrikona',
    term: 'Mūlatrikoṇa',
    plain: 'moolatrikona',
    literal: 'root triangle',
    short: 'A degree range within a graha’s own sign where it is at its most effective.',
    body: 'Ranked between exaltation and simple own-sign placement. Each graha has exactly one, in one of the two signs it rules — the Sun’s is 0° to 20° of Leo — and outside that span in the same sign it is merely in its own sign, which is good but less so.',
    related: ['dignity', 'graha', 'rasi'],
  }),
  E({
    id: 'virupa',
    term: 'Virūpa',
    plain: 'virupa',
    literal: 'a unit of form',
    short: 'The unit ṣaḍbala is measured in. Sixty virūpas make one rūpa.',
    body: 'The classical sources set a minimum rūpa figure each graha should reach. Jade reports the six components in virūpas and deliberately does not total them, because the sources disagree about the weights and a single number would carry a false air of settlement.',
    related: ['shadbala', 'graha'],
  }),
  E({
    id: 'jyotishi',
    term: 'Jyotiṣī',
    plain: 'jyotishi',
    short: 'A practitioner of Jyotiṣa.',
    body: 'The person Jade is built for. The word carries more than "astrologer" does in English — traditionally it implies training in a lineage and in the calculation itself, not only in interpretation, which is why a tool that hides its working is of no use to one.',
    related: ['jyotisa', 'jataka'],
  }),
];
