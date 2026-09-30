import type { TraditionId } from './sources.js';

/**
 * The twelve places, said once.
 *
 * ## Why the topic is separate from the tradition
 *
 * All five traditions agree about most of what a place governs. The seventh is
 * partners and open opponents in every one of them; saying so five times, once
 * per column, is how a reading becomes something nobody finishes. So the topic
 * is written once, in modern words, and a tradition contributes only where it
 * has something the others do not — a different name, or a genuine
 * disagreement about scope.
 *
 * `differ` is therefore usually empty, and that is the point. A column with
 * nothing to add prints nothing.
 *
 * ## The sixth, eighth and twelfth
 *
 * Classically these are the places of illness, of death, and of confinement and
 * loss. Jade will not write that about a living person's chart (CLAUDE.md #6),
 * and the answer is not euphemism — it is to write what the place is actually
 * like to inhabit. The sixth is the daily grind and the things that wear you
 * down; the eighth is what you hold jointly and cannot control alone; the
 * twelfth is what happens away from witnesses. Those are the same houses,
 * described by what a reader can act on.
 */

export interface Place {
  readonly place: number;
  /** The heading. Plain, second person, no Sanskrit and no ordinal jargon. */
  readonly topic: string;
  /** What actually falls under it — concrete nouns, not abstractions. */
  readonly governs: string;
  /** The question somebody arrives with about this part of life. */
  readonly asks: string;
  /** What each tradition calls it, where the name itself is informative. */
  readonly calledIt: Partial<Record<TraditionId, string>>;
  /** A real disagreement between traditions about scope. Usually absent. */
  readonly differ?: string;
}

export const PLACES: readonly Place[] = [
  {
    place: 1,
    topic: 'you, and the body you carry around',
    governs: 'temperament, constitution, the first impression, how you start things',
    asks: 'Why do people read me the way they do before I have said anything?',
    calledIt: { hellenistic: 'the Helm', jyotisha: 'tanu bhāva — the body' },
  },
  {
    place: 2,
    topic: 'what you hold in your own hands',
    governs: 'money you earn yourself, possessions, what you eat, the voice you speak with',
    asks: 'Am I secure, and does it come from me or from somewhere else?',
    calledIt: { hellenistic: 'the Gate of Hades', jyotisha: 'dhana bhāva — wealth' },
    differ:
      'The Hellenistic name is bleak and the Indian one is not, and neither is a mistranslation: the Greek material treats the second as a place a planet cannot see the rising sign from, and the Indian material treats it as accumulated wealth and family. Same twelve degrees of arc, two different questions asked of them.',
  },
  {
    place: 3,
    topic: 'the near distance',
    governs: 'siblings, neighbours, short journeys, letters and messages, the hands and the nerve',
    asks: 'Who is close enough to matter daily, and how do I get my message out?',
    calledIt: { hellenistic: 'the Goddess', jyotisha: 'sahaja bhāva — the born-alongside' },
  },
  {
    place: 4,
    topic: 'the ground under you',
    governs:
      'home, land, the parent who made the house what it was, what you inherit, where you end up',
    asks: 'Where do I actually belong?',
    calledIt: { hellenistic: 'the Subterranean', jyotisha: 'sukha bhāva — ease' },
  },
  {
    place: 5,
    topic: 'what comes out of you',
    governs:
      'children, creative work, play, romance, speculation, and what you happen to be lucky at',
    asks: 'What do I make, and does any of it come back to me?',
    calledIt: { hellenistic: 'Good Fortune', jyotisha: 'putra bhāva — offspring' },
  },
  {
    place: 6,
    topic: 'the grind, and what wears you down',
    governs:
      'daily work, routine, the people who work for you, animals, obligations you did not choose, the frictions you manage rather than resolve',
    asks: 'What is costing me more than it returns, and can I change the terms?',
    calledIt: { hellenistic: 'Bad Fortune', jyotisha: 'ripu bhāva — the adversary' },
    differ:
      'Every tradition also reads the sixth for the body’s complaints, and a great deal of classical medical astrology is built here. Jade does not apply any of it to a person’s chart — the history is in the Learn section, where it belongs, and never attached to yours.',
  },
  {
    place: 7,
    topic: 'whoever is across the table',
    governs:
      'marriage and partnership, business partners, contracts, and open opponents — the ones who declare themselves',
    asks: 'What happens to me in the presence of another person?',
    calledIt: { hellenistic: 'the Setting', jyotisha: 'kalatra bhāva — the spouse' },
  },
  {
    place: 8,
    topic: 'what you hold jointly and cannot settle alone',
    governs:
      'other people’s money, debt, inheritance, taxes, intimacy, and anything that changes you without asking',
    asks: 'What am I depending on someone else for, and what does that cost?',
    calledIt: { hellenistic: 'the Idle Place', jyotisha: 'āyur bhāva — the span' },
    differ:
      'The Greek name means the place the rising sign cannot see, and the Indian name means duration. Both classical traditions read the eighth for the end of life; Jade does not, and never will. What survives that refusal is the useful half — the eighth is where you are entangled with somebody else’s resources and somebody else’s timing.',
  },
  {
    place: 9,
    topic: 'the long view',
    governs:
      'travel that changes you, teachers, law and doctrine, publishing, and whatever you take on faith',
    asks: 'What do I believe, and who taught me to?',
    calledIt: { hellenistic: 'the God', jyotisha: 'dharma bhāva — the way' },
  },
  {
    place: 10,
    topic: 'what you are known for',
    governs:
      'work in public, reputation, rank, the parent who set the standard, and the thing people name when they name you',
    asks: 'What am I for, as far as everybody else is concerned?',
    calledIt: { hellenistic: 'the Midheaven', jyotisha: 'karma bhāva — action' },
  },
  {
    place: 11,
    topic: 'the room you get let into',
    governs:
      'friends and allies, networks, the payoff from what you built, hopes held long enough to count as plans',
    asks: 'Who opens doors for me, and what arrives because of them?',
    calledIt: { hellenistic: 'Good Spirit', jyotisha: 'lābha bhāva — gain' },
  },
  {
    place: 12,
    topic: 'what happens away from witnesses',
    governs:
      'solitude, sleep and dreams, what you spend without seeing it, institutions, and the parts of yourself you keep offstage',
    asks: 'What is going on that I am not looking at?',
    calledIt: { hellenistic: 'Bad Spirit', jyotisha: 'vyaya bhāva — expenditure' },
  },
];

export function placeOf(place: number): Place {
  return PLACES[place - 1]!;
}
