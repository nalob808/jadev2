import { houseSignification, type LordStatement, type LordSurvey } from '@jade/interpret';
import { AutoTerms, Scope, T } from './Glossary';

/**
 * The house lords, and what their pattern is.
 *
 * ## Why a table and not prose
 *
 * The twelve rows are the primary artefact. A practitioner scans them — 2nd
 * lord to the 5th, 9th lord to the 5th — and builds the reading themselves;
 * that scan is the skill, and a paragraph summarising it takes the work away
 * and gives back something less useful. So the table leads, and the pattern
 * statements sit underneath as observations about it, each carrying the rows
 * that produced it.
 *
 * ## The keywords come from the significations library
 *
 * Not written here. The `/learn` pages, the reading, the glossary and this
 * table all draw the meaning of "the 5th house" from one file, so there is no
 * version of Jade in which they disagree.
 */

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

export function LordTable({
  survey,
  statements,
}: {
  readonly survey: LordSurvey;
  readonly statements: readonly LordStatement[];
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto">
        <table aria-label="House lords" className="w-full text-[13px] sm:text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
              <th className="pb-2 pr-3">
                <T id="bhava">House</T>
              </th>
              <th className="pb-2 pr-3">
                <T id="rasi">Sign</T>
              </th>
              <th className="pb-2 pr-3">Lord</th>
              <th className="pb-2 pr-3">Goes to</th>
              <th className="hidden pb-2 md:table-cell">What that house holds</th>
            </tr>
          </thead>
          <tbody>
            {survey.placements.map((row) => {
              const destination = houseSignification(row.inHouse);
              return (
                /* Scoped to the house this row is about, so a term hovered
                   inside it answers about that house rather than the chart. */
                <Scope key={row.house} of={`house:${row.house}`}>
                  <tr className="border-t border-[var(--rule)] align-top">
                    <td className="py-1.5 pr-3 font-mono">
                      <T id={`house-${row.house}`} plainTrigger>
                        {ORDINALS[row.house - 1]}
                      </T>
                    </td>
                    <td className="py-1.5 pr-3">
                      <T id={`sign-${row.sign.toLowerCase()}`} plainTrigger>
                        {row.sign}
                      </T>
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <T id={`graha-${row.lord.toLowerCase()}`} plainTrigger>
                        {row.lord}
                      </T>
                      {row.retrograde ? (
                        <T id="retrograde" plainTrigger>
                          <span className="text-[var(--clay)]"> ℞</span>
                        </T>
                      ) : null}
                      {row.alsoRules ? (
                        <span className="block font-mono text-[10px] text-[var(--ink-faint)]">
                          also rules the {ORDINALS[row.alsoRules - 1]}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={row.ownHouse ? 'text-[var(--jade)]' : undefined}>
                        {ORDINALS[row.inHouse - 1]}
                      </span>
                      <span className="block font-mono text-[10px] text-[var(--ink-faint)]">
                        {degrees(row.degreesInSign)} {row.inSign}
                        {row.ownHouse ? ' · own house' : ''}
                      </span>
                    </td>
                    <td className="hidden py-1.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)] md:table-cell">
                      {destination ? destination.keywords.slice(0, 4).join(', ') : '—'}
                    </td>
                  </tr>
                </Scope>
              );
            })}
          </tbody>
        </table>
      </div>

      {statements.length > 0 ? (
        <section>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            The pattern
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {statements.map((statement) => (
              <li key={statement.text} className="border-l-2 border-[var(--accent-soft)] pl-3">
                <p className="text-[14px] leading-relaxed">
                  <AutoTerms>{statement.text}</AutoTerms>
                </p>
                {/* Constitution #5: the factors travel with the claim, visible
                    beside it rather than behind a disclosure. */}
                <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
                  {statement.factors.map((factor, index) => (
                    <span key={`${factor.kind}-${index}`}>
                      {index > 0 ? ' · ' : ''}
                      {factor.kind}: {factor.detail}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="font-mono text-[10px] text-[var(--ink-faint)]">
        Whole-sign houses: the lord of a house is the lord of that sign. Under a cusp-based frame
        some rows would differ.
      </p>
    </div>
  );
}
