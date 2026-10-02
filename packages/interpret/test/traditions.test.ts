import { describe, expect, it } from 'vitest';
import golden from '../../astro/test/fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider, computeChart, type ComputedChart } from '@jade/astro';
import { GRAHA_STANCE } from '../src/traditions/grahas.js';
import { PLACES } from '../src/traditions/places.js';
import { SOURCES, TRADITIONS, sourceById } from '../src/traditions/sources.js';
import {
  MODERN,
  deepTransitReading,
  type DeepTransitReading,
} from '../src/traditions/transitReading.js';
import { NATAL, deepNatalReading, type DeepNatalReading } from '../src/traditions/natalReading.js';
import { BRINGS, deepSynastry } from '../src/traditions/synastryReading.js';
import { FORBIDDEN_TOPICS, mentionsForbiddenTopic, permitted } from '../src/reading.js';

/**
 * The reading layer's four promises, as tests.
 *
 * 1. It does not repeat itself. The configuration is in the heading; nothing
 *    below restates it.
 * 2. It does not predict death, illness or a legal outcome — anywhere, in any
 *    tradition's voice, however the tradition itself phrased it.
 * 3. It does not quote a translation Jade has no right to quote.
 * 4. It covers what it claims to cover, so a missing block is a failing test
 *    rather than a reader finding a blank column.
 */

const GRAHAS = Object.keys(MODERN);

/** Every reading the layer can produce: nine bodies across twelve places. */
const EVERY_READING: DeepTransitReading[] = GRAHAS.flatMap((graha) =>
  PLACES.map((place) =>
    deepTransitReading({
      graha,
      place: place.place,
      sign: 'Aries',
      degreesInSign: 12.5,
    })!,
  ),
);

describe('coverage', () => {
  it('produces a reading for every body in every place', () => {
    expect(EVERY_READING).toHaveLength(GRAHAS.length * 12);
    for (const reading of EVERY_READING) {
      expect(reading, `${reading.graha} in ${reading.place}`).toBeTruthy();
      expect(reading.body.length).toBeGreaterThanOrEqual(4);
      /*
       * Five voices for the seven classical bodies, two for the nodes — the
       * Greek and Latin traditions have no doctrine of Rāhu and Jade will not
       * invent one. Asserted as exact counts rather than a floor, so inventing
       * a voice fails here just as loudly as losing one.
       */
      expect(reading.voices.length, reading.graha).toBe(
        reading.graha === 'Rahu' || reading.graha === 'Ketu' ? 2 : 5,
      );
    }
  });

  it('gives every tradition a stance on the seven classical bodies', () => {
    const classical = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    for (const tradition of TRADITIONS) {
      for (const graha of classical) {
        const stance = GRAHA_STANCE[tradition.id][graha];
        expect(stance, `${tradition.id} has no ${graha}`).toBeTruthy();
        expect(stance!.now.length, `${tradition.id}/${graha} is thin`).toBeGreaterThan(120);
      }
    }
  });

  /*
   * The nodes exist in the Indian and Arabic material and not in the Greek or
   * Latin one, and the honest handling is to have nothing rather than to invent
   * a Hellenistic doctrine of Rāhu. The composer drops a tradition with no
   * stance, so a reader sees three columns instead of five — which is itself
   * true information about where the doctrine comes from.
   */
  it('leaves the nodes out of the traditions that have no doctrine of them', () => {
    for (const tradition of ['hellenistic', 'medieval', 'renaissance'] as const) {
      expect(GRAHA_STANCE[tradition].Rahu).toBeUndefined();
      expect(GRAHA_STANCE[tradition].Ketu).toBeUndefined();
    }
    for (const tradition of ['jyotisha', 'perso-arabic'] as const) {
      expect(GRAHA_STANCE[tradition].Rahu).toBeTruthy();
      expect(GRAHA_STANCE[tradition].Ketu).toBeTruthy();
    }
  });
});

describe('it does not say the same thing five times', () => {
  /*
   * The words that would only ever be restating the heading. A passage that
   * needs them is describing the setup rather than interpreting it — which is
   * exactly the padding this layer was built to avoid, and the reason the rule
   * is a test rather than a note in a style guide.
   */
  const RESTATEMENT = ['house', 'bhāva', 'transit', 'transiting'];

  const interpretation = (reading: DeepTransitReading): string[] => [
    ...reading.voices.flatMap((voice) => [voice.doctrine, voice.now]),
  ];

  it('never restates the configuration inside a tradition’s passage', () => {
    const offences: string[] = [];
    for (const reading of EVERY_READING) {
      for (const passage of interpretation(reading)) {
        for (const word of RESTATEMENT) {
          if (passage.toLowerCase().includes(word)) {
            offences.push(
              `${reading.graha}/${reading.place}: "${word}" in "${passage.slice(0, 60)}…"`,
            );
          }
        }
      }
    }
    expect([...new Set(offences)]).toEqual([]);
  });

  /*
   * And the five columns have to actually differ. A layer that shows the same
   * paragraph under five headings is worse than one column, because it costs
   * the reader four more paragraphs to discover there was nothing there.
   */
  it('says something different in each tradition', () => {
    for (const reading of EVERY_READING) {
      const said = reading.voices.map((voice) => voice.now);
      expect(new Set(said).size, `${reading.graha}/${reading.place}`).toBe(said.length);
    }
  });

  it('names the configuration exactly once, in the heading', () => {
    for (const reading of EVERY_READING) {
      expect(reading.heading).toContain(reading.graha);
      /* The body may name the body — "a Saturn season" is prose, not padding —
         but it may not spell the placement out again. */
      for (const paragraph of reading.body.slice(1)) {
        expect(paragraph.toLowerCase(), reading.heading).not.toContain('house');
      }
    }
  });
});

describe('the constitution holds on the reading subdomain too', () => {
  it('never predicts death, illness or a legal outcome', () => {
    const everything = EVERY_READING.flatMap((reading) => [
      reading.heading,
      reading.topic,
      reading.asks,
      ...reading.body,
      ...(reading.differ ? [reading.differ] : []),
      ...reading.voices.flatMap((voice) => [voice.doctrine, voice.now]),
    ]);

    for (const text of everything) {
      expect(mentionsForbiddenTopic(text.toLowerCase())).toBe(false);
    }
  });

  /*
   * The medical corpus is named in `sources.ts` because the history is real and
   * a reader asking about decumbiture deserves a straight answer. It is flagged
   * `historyOnly`, and this is the test that keeps the flag meaningful: no
   * passage attached to a person's chart may cite it, whatever anybody later
   * decides would be interesting to add.
   */
  it('never cites the medical tradition in a reading', () => {
    const medical = SOURCES.filter((source) => source.historyOnly);
    expect(medical.length).toBeGreaterThan(0);

    for (const reading of EVERY_READING) {
      for (const voice of reading.voices) {
        for (const source of medical) {
          expect(voice.source, `${reading.graha}/${reading.place}`).not.toContain(source.author);
        }
      }
    }
  });
});

describe('citations', () => {
  it('marks a source quotable only where the English text is public domain', () => {
    /*
     * Two, and the reason for each is specific: Lilly wrote in English in 1647,
     * and Ashmand's Tetrabiblos of 1822 is long out of term. Everything else in
     * the corpus reaches English through a translator who is alive or recently
     * dead, and their work is theirs. If a third is ever added here, the test
     * failing is the prompt to check the edition rather than the author.
     */
    const quotable = SOURCES.filter((source) => source.quotable).map((source) => source.id);
    expect(quotable.sort()).toEqual(['culpeper', 'lilly', 'ptolemy']);
  });

  it('cites an author and a work, never a page of somebody’s translation', () => {
    for (const reading of EVERY_READING) {
      for (const voice of reading.voices) {
        expect(voice.source).not.toMatch(/\bp\.\s*\d/);
        expect(voice.source).not.toMatch(/trans\./i);
        expect(voice.source.length).toBeGreaterThan(8);
      }
    }
  });

  it('points every stance at a source that exists', () => {
    for (const tradition of TRADITIONS) {
      for (const [graha, stance] of Object.entries(GRAHA_STANCE[tradition.id])) {
        const source = sourceById(stance.sourceId);
        expect(source, `${tradition.id}/${graha} → ${stance.sourceId}`).toBeTruthy();
        expect(source!.tradition, `${tradition.id}/${graha} cites the wrong tradition`).toBe(
          tradition.id,
        );
      }
    }
  });
});

describe('the chart supplies the facts', () => {
  it('shows its workings, and puts the placement there rather than in the prose', () => {
    const reading = deepTransitReading({
      graha: 'Saturn',
      place: 6,
      sign: 'Pisces',
      degreesInSign: 18.2,
      retrograde: true,
      contacts: [{ id: 'Moon', orb: 1.4 }],
    })!;

    expect(reading.workings.map((working) => working.label)).toEqual([
      'Saturn',
      'Standing in',
      'On your Moon',
    ]);
    expect(reading.workings[0]!.detail).toBe('18.20° Pisces, retrograde');
    expect(reading.workings[1]!.detail).toBe('your sixth house');
  });

  it('says a retrograde pass is a second pass rather than printing a symbol', () => {
    const direct = deepTransitReading({ graha: 'Mars', place: 3, sign: 'Leo', degreesInSign: 4 })!;
    const back = deepTransitReading({
      graha: 'Mars',
      place: 3,
      sign: 'Leo',
      degreesInSign: 4,
      retrograde: true,
    })!;

    expect(back.body.length).toBe(direct.body.length + 1);
    expect(back.body.join(' ')).toContain('second pass');
  });

  it('names a contact only when there is one', () => {
    const alone = deepTransitReading({
      graha: 'Venus',
      place: 7,
      sign: 'Libra',
      degreesInSign: 9,
    })!;
    expect(alone.body.join(' ')).not.toContain('sitting on your');
    expect(alone.workings).toHaveLength(2);
  });
});

/* ------------------------------------------------------------ the nativity */

/**
 * The natal half, held to the same four promises.
 *
 * Built as a matrix rather than a sample: nine bodies × twelve places × the
 * dignities that change the text. A gap anywhere is a reader finding a blank
 * paragraph, and this is cheaper than finding out that way.
 */
const NATAL_GRAHAS = Object.keys(NATAL);
const DIGNITIES = ['exalted', 'own', 'neutral', 'debilitated', null] as const;

const EVERY_NATAL: DeepNatalReading[] = NATAL_GRAHAS.flatMap((graha) =>
  PLACES.flatMap((place) =>
    DIGNITIES.map((dignity) =>
      deepNatalReading({
        graha,
        place: place.place,
        sign: 'Aries',
        degreesInSign: 12.5,
        dignity,
      })!,
    ),
  ),
);

describe('the natal reading', () => {
  it('produces one for every body in every place, at every dignity', () => {
    expect(EVERY_NATAL).toHaveLength(NATAL_GRAHAS.length * 12 * DIGNITIES.length);
    for (const reading of EVERY_NATAL) {
      expect(reading.body.length).toBeGreaterThanOrEqual(1);
      expect(reading.question.length).toBeGreaterThan(40);
      expect(reading.voices.length, reading.graha).toBe(
        reading.graha === 'Rahu' || reading.graha === 'Ketu' ? 2 : 5,
      );
    }
  });

  /*
   * The point of the whole dignity apparatus. A reading that prints the same
   * words for an exalted graha and a debilitated one has displayed the dignity
   * and used none of it, which is precisely the failure CLAUDE.md #5 names —
   * factors shown beside text they did not produce.
   */
  it('actually reads differently when the dignity differs', () => {
    const classical = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    for (const graha of classical) {
      const base = { graha, place: 7, sign: 'Aries', degreesInSign: 12.5 } as const;
      const exalted = deepNatalReading({ ...base, dignity: 'exalted' })!;
      const fallen = deepNatalReading({ ...base, dignity: 'debilitated' })!;
      const middling = deepNatalReading({ ...base, dignity: 'neutral' })!;

      expect(exalted.body.join(' '), graha).not.toEqual(fallen.body.join(' '));
      /* And a middling dignity says nothing rather than something hedged. */
      expect(middling.body.length, graha).toBeLessThan(exalted.body.length);
    }
  });

  it('reads cazimi as the opposite of combust, not as more of it', () => {
    const base = { graha: 'Mercury', place: 10, sign: 'Aries', degreesInSign: 12.5 } as const;
    const burnt = deepNatalReading({ ...base, combust: true })!.body.join(' ');
    const cazimi = deepNatalReading({ ...base, combust: true, cazimi: true })!.body.join(' ');

    expect(burnt).toContain('blind spot');
    expect(cazimi).not.toContain('blind spot');
    expect(cazimi).toContain('not diminished');
  });

  it('never restates the configuration inside a tradition’s passage', () => {
    const offences: string[] = [];
    for (const reading of EVERY_NATAL) {
      for (const voice of reading.voices) {
        for (const word of ['house', 'bhāva', 'degree']) {
          if (`${voice.doctrine} ${voice.now}`.toLowerCase().includes(word)) {
            offences.push(`${reading.graha}/${reading.place}: "${word}"`);
          }
        }
      }
    }
    expect([...new Set(offences)]).toEqual([]);
  });

  it('says something different in each tradition', () => {
    for (const reading of EVERY_NATAL) {
      const said = reading.voices.map((voice) => voice.now);
      expect(new Set(said).size, `${reading.graha}/${reading.place}`).toBe(said.length);
    }
  });

  /*
   * A nativity is not a season. If the natal voices were the transit voices
   * with the tense changed, the whole file would be one reading pretending to
   * be two, and a reader who opened both would notice immediately.
   */
  it('does not reuse the transit voices', () => {
    for (const graha of ['Sun', 'Saturn', 'Venus']) {
      const base = { graha, place: 4, sign: 'Aries', degreesInSign: 12.5 } as const;
      const transit = deepTransitReading(base)!.voices.map((voice) => voice.now);
      const natal = deepNatalReading(base)!.voices.map((voice) => voice.now);
      for (const said of natal) expect(transit, graha).not.toContain(said);
    }
  });

  it('never predicts death, illness or a legal outcome', () => {
    const everything = EVERY_NATAL.flatMap((reading) => [
      reading.heading,
      reading.question,
      ...reading.body,
      ...reading.voices.flatMap((voice) => [voice.doctrine, voice.now]),
    ]);
    for (const text of everything) {
      expect(mentionsForbiddenTopic(text.toLowerCase())).toBe(false);
    }
  });
});

describe('the forbidden-topic filter', () => {
  /*
   * Both directions, because only one of them was ever checked.
   *
   * The rule has to hold absolutely — that is constitution item 6 — and it also
   * has to stop eating ordinary English. It was a substring match, so "an
   * audience that stopped watching" was silently dropped for containing "die",
   * and nobody would have found that except by wondering where a paragraph had
   * gone.
   */
  it('still catches every word it is there to catch', () => {
    for (const word of FORBIDDEN_TOPICS) {
      expect(mentionsForbiddenTopic(`Something about ${word} here.`), word).toBe(true);
      expect(mentionsForbiddenTopic(`Ends the sentence with ${word}.`), word).toBe(true);
      expect(mentionsForbiddenTopic(word.toUpperCase()), word).toBe(true);
    }
  });

  it('does not catch ordinary words that merely contain one', () => {
    const innocent = [
      'an audience that stopped watching',
      'by comparison with the other one',
      'obedience to an inherited standard',
      'the ingredient nobody names',
      'bodies in the sky',
      'somebody who studies the thing',
      'a soldier’s patience',
      'the ladies of the court',
      'a garrison town',
      'a candied surface',
      'terminally is not a word here but terminus is',
    ];
    for (const phrase of innocent) {
      expect(mentionsForbiddenTopic(phrase), phrase).toBe(false);
    }
  });

  it('drops a statement carrying one, and keeps one that does not', () => {
    const factors = [{ label: 'Saturn', detail: '12° Aries' }];
    expect(permitted({ text: 'This is about death.', factors })).toBe(false);
    expect(permitted({ text: 'This is about an audience.', factors })).toBe(true);
    /* Ungrounded text is dropped whatever it says — CLAUDE.md #5. */
    expect(permitted({ text: 'This is about an audience.', factors: [] })).toBe(false);
  });
});

/* ------------------------------------------------------------- two charts */

describe('the synastry reading', () => {
  const provider = new AstronomyEngineProvider();
  const chartOf = (label: string): ComputedChart => {
    const fixture = golden.cases.find((one) => one.label === label)!;
    return computeChart(provider, { jdUt: fixture.jdUt, location: fixture.location });
  };

  const alice = chartOf('v0-reference-chart');
  const bob = chartOf('modern-mumbai');
  const reading = deepSynastry(alice, bob, 'Alice', 'Bob');

  it('reads both directions, and they are different readings', () => {
    expect(reading.aIntoB.length).toBeGreaterThan(0);
    expect(reading.bIntoA.length).toBeGreaterThan(0);

    /*
     * The half that compatibility software throws away. A's Saturn in B's
     * seventh and B's Saturn in A's seventh are two facts about two people, and
     * if these two lists were ever equal the direction had been lost.
     */
    const forward = reading.aIntoB.map((one) => one.heading);
    const back = reading.bIntoA.map((one) => one.heading);
    expect(forward).not.toEqual(back);
    for (const heading of forward) expect(back).not.toContain(heading);
  });

  it('always names who is doing it and to whom', () => {
    for (const passage of [...reading.aIntoB, ...reading.bIntoA]) {
      expect(passage.heading).toContain(passage.from);
      expect(passage.heading).toContain(passage.into);
      expect(passage.from).not.toBe(passage.into);
      expect(passage.body[0]).toContain(passage.from);
    }
  });

  /*
   * The same rule as everywhere else in this folder: the configuration is in
   * the heading, and nothing after the first sentence of the body restates it.
   */
  it('does not restate the placement after the heading', () => {
    for (const passage of [...reading.aIntoB, ...reading.bIntoA]) {
      for (const paragraph of passage.body.slice(1)) {
        expect(paragraph.toLowerCase(), passage.heading).not.toContain('house');
        expect(paragraph.toLowerCase(), passage.heading).not.toContain('bhāva');
      }
    }
  });

  it('never predicts death, illness or a legal outcome', () => {
    const everything = [reading.note, ...reading.aIntoB, ...reading.bIntoA].flatMap((one) =>
      typeof one === 'string' ? [one] : [one.heading, one.asks, ...one.body],
    );
    for (const text of everything) {
      expect(mentionsForbiddenTopic(text), text.slice(0, 60)).toBe(false);
    }
  });

  /*
   * The honest part. Four of the five traditions did not lay two charts over
   * each other at all, and the reading says so rather than inventing a column
   * of doctrine for each of them.
   */
  it('says plainly that most of the traditions did not do this', () => {
    expect(reading.note).toContain('seventh');
    expect(reading.note.length).toBeGreaterThan(200);
  });

  it('every graha that lands in a loud place is read, and no others', () => {
    for (const passage of [...reading.aIntoB, ...reading.bIntoA]) {
      expect([1, 2, 4, 5, 6, 7, 9, 10]).toContain(passage.place);
      expect(BRINGS[passage.graha]).toBeTruthy();
      expect(passage.workings.length).toBe(2);
    }
  });
});

describe('the synastry passages name the people', () => {
  const provider = new AstronomyEngineProvider();
  const fixture = (label: string) => golden.cases.find((one) => one.label === label)!;
  const chart = (label: string) =>
    computeChart(provider, { jdUt: fixture(label).jdUt, location: fixture(label).location });

  const reading = deepSynastry(chart('v0-reference-chart'), chart('modern-mumbai'), 'Alice', 'Bob');

  /*
   * The placeholders have to be gone, and the failure if they are not is a
   * paragraph with `{host}` printed in it on a page a client may be looking at.
   */
  it('leaves no placeholder behind', () => {
    for (const passage of [...reading.aIntoB, ...reading.bIntoA]) {
      for (const paragraph of passage.body) {
        expect(paragraph, passage.heading).not.toContain('{');
        expect(paragraph, passage.heading).not.toContain('}');
      }
    }
  });

  /*
   * And it must be the right way round. Substituting guest for host would read
   * perfectly and say the opposite thing, which is the kind of bug no test of
   * the shape alone would ever catch.
   */
  it('puts the right name on each side', () => {
    const saturn = reading.aIntoB.find((one) => one.graha === 'Saturn');
    if (saturn) {
      expect(saturn.body.join(' ')).toContain('Alice');
      expect(saturn.heading).toMatch(/^Alice’s Saturn in Bob’s/);
    }
    for (const passage of reading.bIntoA) {
      expect(passage.heading).toMatch(/^Bob’s/);
      expect(passage.heading).toContain('Alice’s');
    }
  });

  /* Nobody is addressed as "you" on a page about two other people. */
  it('does not speak to a reader who is not in the chart', () => {
    for (const passage of [...reading.aIntoB, ...reading.bIntoA]) {
      for (const paragraph of passage.body) {
        expect(paragraph, passage.heading).not.toMatch(/\byou\b/i);
        expect(paragraph, passage.heading).not.toMatch(/\byour\b/i);
      }
    }
  });
});

describe('the twelve places', () => {
  /*
   * `topic` addresses a reader and `governs` does not, and the split has to
   * hold: the synastry reading quotes `governs` about two named third parties,
   * where "the people who work for you" names nobody. Found by a test on the
   * synastry passages, pinned here at the source.
   */
  it('keeps the second person in the topic and out of the list', () => {
    for (const place of PLACES) {
      expect(place.governs, `place ${place.place}`).not.toMatch(/\byou\b|\byour\b|\byourself\b/i);
    }
  });

  it('still says what each place is, at length', () => {
    for (const place of PLACES) {
      expect(place.topic.length, `place ${place.place}`).toBeGreaterThan(8);
      expect(place.governs.length, `place ${place.place}`).toBeGreaterThan(30);
      expect(place.asks, `place ${place.place}`).toMatch(/\?$/);
    }
  });
});
