/**
 * The plain-voice blocks for time: periods, transits, and planets in signs.
 *
 * `voice/library.ts` covers the standing chart — what a house is, how a planet
 * behaves. This covers what is happening *now*, which is the half a person
 * actually arrives asking about and the half the first cut of the reading
 * surface had no words for.
 *
 * Same rules as the rest of the plain register: second person, no untranslated
 * Sanskrit, concrete over mystical, and **no prediction of death, illness or
 * legal outcome**. That last rule bites hardest here, because a period or a
 * transit is the natural place to make a forecast and the tradition is full of
 * them. Jade describes the weather, never the outcome.
 */

export interface DashaVoice {
  readonly id: string;
  /** What a period ruled by this planet is *like* to live through. */
  readonly period: string;
  /** What the period tends to put in front of you. */
  readonly brings: string;
  /** The honest difficulty, said without forecasting. */
  readonly asks: string;
}

/**
 * Each planet as the ruler of a stretch of life.
 *
 * A daśā is the single most useful thing Vedic astrology has and the single
 * easiest place to frighten somebody. These are written as descriptions of a
 * period's character — what it emphasises, what it demands — never as
 * statements about what will happen to the reader.
 */
export const DASHA_VOICE: readonly DashaVoice[] = [
  {
    id: 'Sun',
    period:
      'A Sun period tends to be about standing somewhere visible. Questions of authority, recognition and who you answer to come forward, and so does the plain matter of whether you are willing to be seen.',
    brings:
      'visibility, responsibility, dealings with people in charge, and pressure to be definite',
    asks: 'It asks you to stop hedging about what you actually want to be known for.',
  },
  {
    id: 'Moon',
    period:
      'A Moon period is emotionally weathered — moods move, home and family come to the centre, and what you need in order to feel settled becomes hard to ignore.',
    brings:
      'domestic change, closeness to family and to women in your life, and a great deal of feeling',
    asks: 'It asks you to take your own comfort seriously rather than treating it as optional.',
  },
  {
    id: 'Mars',
    period:
      'A Mars period is active and often abrasive. Things move because you push them, competition sharpens, and patience is not the resource on offer.',
    brings: 'drive, conflict, physical work, property matters, and decisions made quickly',
    asks: 'It asks you to spend the energy deliberately, because it will be spent either way.',
  },
  {
    id: 'Mercury',
    period:
      'A Mercury period is busy in the head. Study, trade, writing, negotiation and a great many moving parts — it is a period of arrangement rather than of force.',
    brings: 'learning, commerce, travel, paperwork, and a lot of conversation',
    asks: 'It asks you to finish what you start, because Mercury will happily begin six things.',
  },
  {
    id: 'Jupiter',
    period:
      'A Jupiter period widens things. Teachers appear, scope grows, and matters of belief and principle take on weight they did not have before.',
    brings: 'growth, guidance, study, children, and a general loosening of constraints',
    asks: 'It asks you to be careful about scale — Jupiter expands whatever it is given, including mistakes.',
  },
  {
    id: 'Venus',
    period:
      'A Venus period is about pleasure, relationship and taste. Comfort becomes more available and more tempting, and what you want tends to matter more than what you ought to do.',
    brings: 'relationships, beauty, money spent well and badly, art, and ease',
    asks: 'It asks you to notice the difference between what you enjoy and what you are avoiding.',
  },
  {
    id: 'Saturn',
    period:
      'A Saturn period is long, slow and serious, and it is the most misread period in the tradition. Saturn withholds in order to make things durable — what is built here is built properly or not at all.',
    brings: 'work, responsibility, delay, endurance, and results that arrive late and then hold',
    asks: 'It asks for patience, and it does not negotiate about that.',
  },
  {
    id: 'Rahu',
    period:
      'A Rāhu period is unfamiliar territory. Ambition runs hot, things move suddenly, and you often end up somewhere your background did not predict.',
    brings: 'foreign places, sudden rises, obsession, and appetite that outpaces satisfaction',
    asks: 'It asks you to keep hold of your own judgement while everything accelerates.',
  },
  {
    id: 'Ketu',
    period:
      'A Ketu period loosens your grip. Interest drains out of things that used to hold it, and attention turns inward — often toward study, solitude or something with no obvious use.',
    brings: 'detachment, spiritual interest, endings that arrive quietly, and unexpected expertise',
    asks: 'It asks you to let go of what has finished rather than holding it out of habit.',
  },
];

export interface TransitVoice {
  readonly id: string;
  /** What this planet crossing a house does while it is there. */
  readonly crossing: string;
  /** What it does when it reaches a natal point exactly. */
  readonly arriving: string;
}

/**
 * Transiting planets, by what they do to the house they are crossing.
 *
 * Only the slow ones are written. Mars is over a degree in days and the Moon in
 * hours; a reading that reported those would be noise, and the technical
 * surfaces already have them for anyone who wants them.
 */
export const TRANSIT_VOICE: readonly TransitVoice[] = [
  {
    id: 'Jupiter',
    crossing:
      'Jupiter is crossing this part of your chart, which classically opens it up — more room, more help, more scope than usual for about a year.',
    arriving:
      'Jupiter is arriving on this point exactly. This is the contact the tradition is most positive about, and it typically shows as an opportunity that needs you to say yes to it.',
  },
  {
    id: 'Saturn',
    crossing:
      'Saturn is crossing this part of your chart and will be for around two and a half years. Saturn slows whatever it touches and asks it to be done properly — this area gets heavier and more real rather than worse.',
    arriving:
      'Saturn is arriving on this point exactly. This is a demanding contact: it tends to show as work, delay and a requirement to be serious about something you had been treating lightly.',
  },
  {
    id: 'Rahu',
    crossing:
      'Rāhu is crossing this part of your chart, which tends to make it restless and magnified — more wanted, less easily satisfied, for about eighteen months.',
    arriving:
      'Rāhu is arriving on this point exactly, which usually intensifies whatever it touches and makes it harder to be moderate about.',
  },
  {
    id: 'Ketu',
    crossing:
      'Ketu is crossing this part of your chart, which tends to thin out your interest in it for about eighteen months — not loss so much as a quiet loosening of grip.',
    arriving:
      'Ketu is arriving on this point exactly, which often shows as detachment from something you used to care about more.',
  },
];

/**
 * Saturn's transit relative to the natal Moon — the question people actually ask.
 *
 * Sade sati is the single most-searched idea in Vedic astrology and the single
 * most badly handled. It is stated here as what it is: a seven-and-a-half year
 * stretch while Saturn crosses the sign before the Moon, the Moon's own sign,
 * and the one after. No forecast, no severity rating, and an explicit line
 * about the fear around it, because the fear is what most people arrive with.
 */
export const SADE_SATI_VOICE = {
  before:
    'Saturn is in the sign before your Moon, which is the opening third of the stretch the tradition calls sade sati. It usually registers as a slow increase in weight and responsibility rather than an event.',
  over: 'Saturn is transiting your Moon’s own sign — the middle third of sade sati, and the part the tradition treats as the most demanding. It tends to sit on mood and on home life, and to ask for endurance.',
  after:
    'Saturn is in the sign after your Moon, the closing third of sade sati. This is typically the part where whatever has been built through the stretch starts to hold on its own.',
  none: 'Saturn is nowhere near your Moon at the moment, so sade sati is not running.',
  caveat:
    'Sade sati has a worse reputation than it deserves. It is a long, serious stretch that asks for patience — it is not a verdict, and Jade will not tell you what it means for your life. What it means depends on the rest of the chart and on you.',
} as const;

export function dashaVoice(id: string): DashaVoice | undefined {
  return DASHA_VOICE.find((entry) => entry.id === id);
}

export function transitVoice(id: string): TransitVoice | undefined {
  return TRANSIT_VOICE.find((entry) => entry.id === id);
}
