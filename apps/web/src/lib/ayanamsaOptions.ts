import { AYANAMSA_LABELS, isFittedAyanamsa, type AyanamsaMode } from '@jade/astro';

/**
 * The ayanāṁśa choices, as the settings form shows them.
 *
 * Lives here rather than in the page so it can be tested, and is built from
 * `AYANAMSA_LABELS` rather than written out again so a zodiac the core declares
 * cannot quietly be missing from the form. `AYANAMSA_NOTES` is a total record,
 * which means declaring a ninth mode without explaining it to a reader is a
 * type error rather than a blank line in the UI.
 *
 * `fitted` comes from the core's own capability check. Six of the eight have no
 * coefficients yet; they stay on the list, disabled, because ayanāṁśa is the
 * most consequential setting in the app and a KP astrologer should be able to
 * see that Jade knows what Krishnamurti is and has not fitted it yet. Removing
 * them would read as never having heard of it.
 */

export interface AyanamsaOption {
  readonly id: AyanamsaMode;
  readonly name: string;
  readonly note: string;
  readonly fitted: boolean;
}

/** Why someone would choose each one, in a sentence. */
export const AYANAMSA_NOTES: Record<AyanamsaMode, string> = {
  lahiri: 'The Indian government standard. Most widely used.',
  lahiri_true_chitra: 'Spica fixed at exactly 180°. Differs from Lahiri by minutes.',
  raman: 'B. V. Raman’s value.',
  krishnamurti: 'Required for KP technique.',
  yukteshwar: 'From The Holy Science.',
  fagan_bradley: 'The Western sidereal standard.',
  suryasiddhanta: 'The classical text’s own value.',
  custom: 'Your own value at J2000, in degrees.',
};

export const AYANAMSA_OPTIONS: readonly AyanamsaOption[] = (
  Object.keys(AYANAMSA_LABELS) as AyanamsaMode[]
).map((id) => ({
  id,
  name: AYANAMSA_LABELS[id],
  note: AYANAMSA_NOTES[id],
  fitted: isFittedAyanamsa(id),
}));

/** The ones a workspace cannot be set to yet, for the line under the field. */
export const UNFITTED_AYANAMSAS: readonly AyanamsaOption[] = AYANAMSA_OPTIONS.filter(
  (option) => !option.fitted,
);
