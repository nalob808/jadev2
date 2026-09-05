import type { NewPublicFigure } from '../src/schema.js';

/**
 * The seed roster for the public chart library.
 *
 * ## The rule this file follows
 *
 * A birth time appears here only when a source actually attests it. Where no
 * time is attested the row is rated `X` and `birthTime` is null — and the
 * application then refuses to draw an ascendant. It is not rounded to noon, not
 * "approximately dawn", not quietly taken from whichever astrology site had a
 * number. The database enforces the pairing; this file honours the spirit.
 *
 * ## What that costs, and why it is right
 *
 * Most entries below are rated X. That is not laziness — it is what the
 * evidence actually supports. Encyclopaedic sources record the date and place
 * of a birth and almost never the hour. Times for famous people circulate
 * widely in astrological literature, usually without any primary source and
 * frequently disagreeing with each other by hours.
 *
 * The honest consequence is a library where most charts cannot show a lagna,
 * and Jade says so on the page. That is more useful than the alternative, not
 * less: a student learning from a confidently-drawn ascendant resting on
 * somebody's guess has been taught something false about their own craft. And
 * it is the one thing no competitor will admit.
 *
 * ## Adding to it
 *
 * Add a row, run `pnpm --filter @jade/db seed:figures`. It upserts on slug, so
 * correcting a record is editing this file and re-running. When you find a
 * sourced time for somebody rated X here, change the rating, add the time, and
 * put where you found it in `timeSource` — that field is printed on the page.
 *
 * Summaries are written for Jade rather than pasted, because the encyclopaedias
 * they would otherwise come from are variously licensed and a library built on
 * copied prose is one that has to be taken down later.
 */

export const PUBLIC_FIGURES: readonly NewPublicFigure[] = [
  // ------------------------------------------------------------- Jyotiṣa
  {
    slug: 'srinivasa-ramanujan',
    displayName: 'Srinivasa Ramanujan',
    sortName: 'Ramanujan, Srinivasa',
    summary:
      'Mathematician who arrived at thousands of results in number theory and infinite series with almost no formal training, working largely alone in Kumbakonam before Hardy brought him to Cambridge in 1914. He attributed his formulae to the goddess Namagiri. Notebooks he left at his death were still yielding new mathematics seventy years later.',
    birthDate: '1887-12-22',
    birthTime: null,
    rodden: 'X',
    placeName: 'Erode, Tamil Nadu, India',
    latitude: 11.341,
    longitude: 77.7172,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1920-04-26',
    tags: ['mathematician', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Srinivasa_Ramanujan',
    provenanceNote:
      'Charts for Ramanujan circulate widely but the times in them are described as tentative even by the astrologers publishing them. No attested time is recorded here.',
  },
  {
    slug: 'ramana-maharshi',
    displayName: 'Ramana Maharshi',
    sortName: 'Ramana Maharshi',
    alsoKnownAs: 'Venkataraman Iyer',
    summary:
      'Advaita teacher who, at sixteen, underwent a spontaneous confrontation with death that he described as dissolving the sense of being a separate person. He left for Arunachala and stayed the rest of his life, teaching mostly in silence and answering questions with the single instruction to ask who is asking.',
    birthDate: '1879-12-30',
    birthTime: null,
    rodden: 'X',
    placeName: 'Tiruchuzhi, Tamil Nadu, India',
    latitude: 9.5333,
    longitude: 78.25,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1950-04-14',
    tags: ['philosopher', 'mystic'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Ramana_Maharshi',
  },
  {
    slug: 'swami-vivekananda',
    displayName: 'Swami Vivekananda',
    sortName: 'Vivekananda, Swami',
    alsoKnownAs: 'Narendranath Datta',
    summary:
      'Monk and disciple of Ramakrishna who introduced Vedānta and Yoga to a Western audience at the 1893 Parliament of the World’s Religions in Chicago, and founded the Ramakrishna Mission on his return. Born during Makar Saṅkrānti.',
    birthDate: '1863-01-12',
    birthTime: null,
    rodden: 'X',
    placeName: 'Kolkata, West Bengal, India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1902-07-04',
    tags: ['philosopher', 'monk', 'reformer'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Swami_Vivekananda',
  },
  {
    slug: 'sri-aurobindo',
    displayName: 'Sri Aurobindo',
    sortName: 'Aurobindo, Sri',
    alsoKnownAs: 'Aurobindo Ghose',
    summary:
      'Poet, nationalist and philosopher who moved from revolutionary politics to a yoga of his own devising, spending the second half of his life in Pondicherry writing The Life Divine and Savitri. Educated entirely in England until the age of twenty-one.',
    birthDate: '1872-08-15',
    birthTime: null,
    rodden: 'X',
    placeName: 'Kolkata, West Bengal, India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1950-12-05',
    tags: ['philosopher', 'poet', 'mystic'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Sri_Aurobindo',
  },
  {
    slug: 'mohandas-gandhi',
    displayName: 'Mohandas Gandhi',
    sortName: 'Gandhi, Mohandas',
    alsoKnownAs: 'Mahatma Gandhi',
    summary:
      'Lawyer who developed satyāgraha — mass non-violent resistance — first against discriminatory law in South Africa and then against British rule in India. Assassinated in Delhi in 1948, five months after independence.',
    birthDate: '1869-10-02',
    birthTime: null,
    rodden: 'X',
    placeName: 'Porbandar, Gujarat, India',
    latitude: 21.6417,
    longitude: 69.6293,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1948-01-30',
    tags: ['politician', 'reformer', 'lawyer'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Mahatma_Gandhi',
    provenanceNote:
      'Several birth times for Gandhi circulate in astrological literature and they disagree with one another by more than an hour. Rather than pick one, none is recorded.',
  },
  {
    slug: 'rabindranath-tagore',
    displayName: 'Rabindranath Tagore',
    sortName: 'Tagore, Rabindranath',
    summary:
      'Poet, composer and playwright, the first non-European to win the Nobel Prize in Literature, in 1913. Wrote the national anthems of both India and Bangladesh, and reshaped Bengali letters almost single-handedly.',
    birthDate: '1861-05-07',
    birthTime: null,
    rodden: 'X',
    placeName: 'Kolkata, West Bengal, India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1941-08-07',
    tags: ['poet', 'writer', 'composer'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Rabindranath_Tagore',
  },
  {
    slug: 'paramahansa-yogananda',
    displayName: 'Paramahansa Yogananda',
    sortName: 'Yogananda, Paramahansa',
    alsoKnownAs: 'Mukunda Lal Ghosh',
    summary:
      'Monk who moved to the United States in 1920 and spent three decades teaching Kriyā Yoga there. His Autobiography of a Yogi, published in 1946, remains the book through which most Western readers first meet Indian spiritual practice.',
    birthDate: '1893-01-05',
    birthTime: null,
    rodden: 'X',
    placeName: 'Gorakhpur, Uttar Pradesh, India',
    latitude: 26.7606,
    longitude: 83.3732,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1952-03-07',
    tags: ['monk', 'writer', 'mystic'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Paramahansa_Yogananda',
  },
  {
    slug: 'bv-raman',
    displayName: 'B. V. Raman',
    sortName: 'Raman, B. V.',
    alsoKnownAs: 'Bangalore Venkata Raman',
    summary:
      'Astrologer and editor of The Astrological Magazine for over sixty years, and the author of the textbooks through which most English-speaking students still learn Jyotiṣa. The Raman ayanāṁśa, which Jade offers alongside Lahiri, is his.',
    birthDate: '1912-08-08',
    birthTime: null,
    rodden: 'X',
    placeName: 'Bengaluru, Karnataka, India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezoneId: 'Asia/Kolkata',
    diedOn: '1998-12-20',
    tags: ['astrologer', 'writer'],
    sourceUrl: 'https://en.wikipedia.org/wiki/B._V._Raman',
  },
  {
    slug: 'ravi-shankar',
    displayName: 'Ravi Shankar',
    sortName: 'Shankar, Ravi',
    summary:
      'Sitarist and composer who brought Hindustani classical music to a global audience through collaborations with Yehudi Menuhin and George Harrison, and who wrote three concertos for sitar and orchestra.',
    birthDate: '1920-04-07',
    birthTime: null,
    rodden: 'X',
    placeName: 'Varanasi, Uttar Pradesh, India',
    latitude: 25.3176,
    longitude: 82.9739,
    timezoneId: 'Asia/Kolkata',
    diedOn: '2012-12-11',
    tags: ['musician', 'composer'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Ravi_Shankar',
  },

  // ------------------------------------------------------------- science
  {
    slug: 'albert-einstein',
    displayName: 'Albert Einstein',
    sortName: 'Einstein, Albert',
    summary:
      'Physicist whose 1905 papers on the photoelectric effect, Brownian motion and special relativity each would have made a career, and whose general relativity of 1915 replaced Newton’s account of gravity with the curvature of spacetime.',
    birthDate: '1879-03-14',
    birthTime: '11:30:00',
    rodden: 'AA',
    timeSource:
      'Ulm birth register, widely reproduced; the standard AA rating in astrological reference works.',
    placeName: 'Ulm, Baden-Württemberg, Germany',
    latitude: 48.3984,
    longitude: 9.9916,
    timezoneId: 'Europe/Berlin',
    diedOn: '1955-04-18',
    tags: ['physicist', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Albert_Einstein',
  },
  {
    slug: 'marie-curie',
    displayName: 'Marie Curie',
    sortName: 'Curie, Marie',
    alsoKnownAs: 'Maria Skłodowska',
    summary:
      'Physicist and chemist who discovered polonium and radium, coined the term radioactivity, and remains the only person to win Nobel Prizes in two different sciences. She refused to patent the isolation of radium.',
    birthDate: '1867-11-07',
    birthTime: null,
    rodden: 'X',
    placeName: 'Warsaw, Poland',
    latitude: 52.2297,
    longitude: 21.0122,
    timezoneId: 'Europe/Warsaw',
    diedOn: '1934-07-04',
    tags: ['physicist', 'chemist', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Marie_Curie',
  },
  {
    slug: 'isaac-newton',
    displayName: 'Isaac Newton',
    sortName: 'Newton, Isaac',
    summary:
      'Set out the laws of motion and universal gravitation in the Principia of 1687, invented calculus in parallel with Leibniz, and spent rather more of his life on alchemy and biblical chronology than on either.',
    birthDate: '1643-01-04',
    birthTime: null,
    rodden: 'X',
    placeName: 'Woolsthorpe-by-Colsterworth, Lincolnshire, England',
    latitude: 52.809,
    longitude: -0.627,
    timezoneId: 'Europe/London',
    diedOn: '1727-03-31',
    tags: ['physicist', 'mathematician', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Isaac_Newton',
    provenanceNote:
      'Born 25 December 1642 by the Julian calendar England still used; the date stored here is the Gregorian equivalent, 4 January 1643, which is what the ephemeris needs. Both are the same morning.',
  },
  {
    slug: 'nikola-tesla',
    displayName: 'Nikola Tesla',
    sortName: 'Tesla, Nikola',
    summary:
      'Engineer whose alternating-current induction motor and polyphase system settled how electricity would be distributed, and who filed some three hundred patents while dying nearly penniless in a New York hotel.',
    birthDate: '1856-07-10',
    birthTime: null,
    rodden: 'X',
    placeName: 'Smiljan, Croatia',
    latitude: 44.5697,
    longitude: 15.3128,
    timezoneId: 'Europe/Zagreb',
    diedOn: '1943-01-07',
    tags: ['engineer', 'inventor', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Nikola_Tesla',
  },
  {
    slug: 'charles-darwin',
    displayName: 'Charles Darwin',
    sortName: 'Darwin, Charles',
    summary:
      'Naturalist whose five years aboard the Beagle produced the observations behind On the Origin of Species, published in 1859 after two decades of deliberate delay.',
    birthDate: '1809-02-12',
    birthTime: null,
    rodden: 'X',
    placeName: 'Shrewsbury, Shropshire, England',
    latitude: 52.7069,
    longitude: -2.7539,
    timezoneId: 'Europe/London',
    diedOn: '1882-04-19',
    tags: ['naturalist', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Charles_Darwin',
  },
  {
    slug: 'ada-lovelace',
    displayName: 'Ada Lovelace',
    sortName: 'Lovelace, Ada',
    alsoKnownAs: 'Augusta Ada King',
    summary:
      'Mathematician who, in notes appended to a translation about Babbage’s Analytical Engine, described how such a machine might act on symbols rather than numbers — and wrote what is generally counted the first algorithm intended for a machine.',
    birthDate: '1815-12-10',
    birthTime: null,
    rodden: 'X',
    placeName: 'London, England',
    latitude: 51.5074,
    longitude: -0.1278,
    timezoneId: 'Europe/London',
    diedOn: '1852-11-27',
    tags: ['mathematician', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
  },
  {
    slug: 'carl-sagan',
    displayName: 'Carl Sagan',
    sortName: 'Sagan, Carl',
    summary:
      'Astronomer who worked on the Mariner, Viking and Voyager missions and then explained them to everybody else, through Cosmos and a shelf of books. Assembled the Voyager Golden Record.',
    birthDate: '1934-11-09',
    birthTime: null,
    rodden: 'X',
    placeName: 'Brooklyn, New York, USA',
    latitude: 40.6782,
    longitude: -73.9442,
    timezoneId: 'America/New_York',
    diedOn: '1996-12-20',
    tags: ['astronomer', 'writer', 'scientist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Carl_Sagan',
  },

  // ---------------------------------------------------------------- arts
  {
    slug: 'freddie-mercury',
    displayName: 'Freddie Mercury',
    sortName: 'Mercury, Freddie',
    alsoKnownAs: 'Farrokh Bulsara',
    summary:
      'Singer and songwriter, the voice of Queen, with a four-octave range and a command of a stadium that has not really been matched. Wrote Bohemian Rhapsody, Somebody to Love and Don’t Stop Me Now.',
    birthDate: '1946-09-05',
    birthTime: null,
    rodden: 'X',
    placeName: 'Stone Town, Zanzibar, Tanzania',
    latitude: -6.1659,
    longitude: 39.2026,
    timezoneId: 'Africa/Dar_es_Salaam',
    diedOn: '1991-11-24',
    tags: ['musician', 'singer', 'songwriter'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Freddie_Mercury',
  },
  {
    slug: 'frida-kahlo',
    displayName: 'Frida Kahlo',
    sortName: 'Kahlo, Frida',
    summary:
      'Painter of some fifty-five self-portraits, made largely during recoveries from the bus accident at eighteen that shaped the rest of her life and much of her work.',
    birthDate: '1907-07-06',
    birthTime: null,
    rodden: 'X',
    placeName: 'Coyoacán, Mexico City, Mexico',
    latitude: 19.3467,
    longitude: -99.1618,
    timezoneId: 'America/Mexico_City',
    diedOn: '1954-07-13',
    tags: ['painter', 'artist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Frida_Kahlo',
  },
  {
    slug: 'virginia-woolf',
    displayName: 'Virginia Woolf',
    sortName: 'Woolf, Virginia',
    summary:
      'Novelist and essayist who pushed narrative inward — Mrs Dalloway, To the Lighthouse, The Waves — and argued in A Room of One’s Own that the material conditions of writing decide who gets to write.',
    birthDate: '1882-01-25',
    birthTime: null,
    rodden: 'X',
    placeName: 'London, England',
    latitude: 51.4816,
    longitude: -0.1795,
    timezoneId: 'Europe/London',
    diedOn: '1941-03-28',
    tags: ['writer', 'novelist'],
    sourceUrl: 'https://en.wikipedia.org/wiki/Virginia_Woolf',
  },
];
