import { addPerson, editPerson } from '@/app/actions';
import { PlacePicker, type PlaceOption } from './PlacePicker';
import { SubmitButton } from './SubmitButton';

const FIELD = 'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base';

/**
 * One form for adding and for correcting a person.
 *
 * Deliberately one component rather than two. The fields are the same, the
 * validation is the same, and the failure mode of keeping them apart is
 * specific and bad: a field added to the add form and forgotten on the edit
 * form silently blanks that value on every save. Birth data is the wrong place
 * to run that risk.
 *
 * A plain server-action form. The only client islands are the place search and
 * the submit button, which keeps the amount of JavaScript on the phone small.
 */

export interface PersonDefaults {
  readonly id: string;
  readonly displayName: string;
  readonly relationship: string;
  /** The wall clock as recorded — "1994-03-11T07:45:00". */
  readonly localDatetime: string;
  readonly timeAccuracy: string;
  readonly place: PlaceOption;
  readonly sourceNote: string | null;
}

export function PersonForm({
  error,
  person,
}: {
  error?: string;
  /** Absent for a new person; present to correct an existing one. */
  person?: PersonDefaults;
}): React.ReactElement {
  const editing = Boolean(person);

  // Split off the stored wall clock rather than converting anything. The
  // characters on record are what the birth certificate said, and re-deriving
  // them from the UTC instant would reintroduce exactly the rounding this
  // schema stores text to avoid.
  const [datePart, timePart] = (person?.localDatetime ?? '').split('T');

  return (
    <form action={editing ? editPerson : addPerson} className="flex flex-col gap-5">
      {error ? (
        <p className="border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--paper)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {person ? <input type="hidden" name="id" value={person.id} /> : null}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="displayName">
          Name
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          defaultValue={person?.displayName ?? ''}
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="date">
            Date of birth
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={datePart ?? ''}
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="time">
            Time
          </label>
          <input
            id="time"
            name="time"
            type="time"
            defaultValue={timePart ? timePart.slice(0, 5) : '12:00'}
            className={FIELD}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="timeAccuracy">
          How sure is the time?
        </label>
        <select
          id="timeAccuracy"
          name="timeAccuracy"
          defaultValue={person?.timeAccuracy ?? 'exact'}
          className={FIELD}
        >
          <option value="exact">Exact — from a birth certificate</option>
          <option value="min5">Within about 5 minutes</option>
          <option value="min30">Within about half an hour</option>
          <option value="hour2">Within a couple of hours</option>
          <option value="unknown">Unknown — noon used as a placeholder</option>
        </select>
        <p className="text-xs text-[var(--ink-muted)]">
          This drives the confidence band on the ascendant. Saying you are unsure is more useful
          than guessing.
        </p>
      </div>

      <PlacePicker initial={person?.place ?? null} />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="relationship">
          Who is this?
        </label>
        <select
          id="relationship"
          name="relationship"
          defaultValue={person?.relationship ?? 'other'}
          className={FIELD}
        >
          <option value="self">Me</option>
          <option value="partner">My partner</option>
          <option value="family">Family</option>
          <option value="friend">Friend</option>
          <option value="client">Client</option>
          <option value="public_figure">Public figure</option>
          <option value="other">Someone else</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="sourceNote">
          Where the data came from{' '}
          <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
        </label>
        <input
          id="sourceNote"
          name="sourceNote"
          defaultValue={person?.sourceNote ?? ''}
          placeholder="Birth certificate; mother’s recollection; rectified"
          className={FIELD}
        />
        <p className="text-xs text-[var(--ink-muted)]">
          Worth recording. A year from now the difference between a certificate and a memory is the
          difference between trusting the ascendant and rectifying it.
        </p>
      </div>

      <input type="hidden" name="offsetMode" value="tzdb" />

      {editing ? (
        <div className="flex flex-col gap-2">
          <SubmitButton pendingLabel="Recasting the chart…">Save changes</SubmitButton>
          <p className="text-xs text-[var(--ink-muted)]">
            Changing the moment or the place recasts the chart. Notes stay attached — they are
            anchored to factors by name, not to a computed chart.
          </p>
        </div>
      ) : (
        <SubmitButton pendingLabel="Casting the chart…">Add person</SubmitButton>
      )}
    </form>
  );
}
