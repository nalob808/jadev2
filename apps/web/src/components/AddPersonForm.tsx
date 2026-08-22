import { addPerson } from '@/app/actions';
import { PlacePicker } from './PlacePicker';
import { SubmitButton } from './SubmitButton';

const FIELD = 'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base';

/**
 * A plain server-action form. The only client islands are the place search and
 * the submit button, which keeps the amount of JavaScript on the phone small.
 */
export function AddPersonForm({ error }: { error?: string }): React.ReactElement {
  return (
    <form action={addPerson} className="flex flex-col gap-5">
      {error ? (
        <p className="border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--paper)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="displayName">
          Name
        </label>
        <input id="displayName" name="displayName" required className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="date">
            Date of birth
          </label>
          <input id="date" name="date" type="date" required className={FIELD} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="time">
            Time
          </label>
          <input id="time" name="time" type="time" defaultValue="12:00" className={FIELD} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="timeAccuracy">
          How sure is the time?
        </label>
        <select id="timeAccuracy" name="timeAccuracy" defaultValue="exact" className={FIELD}>
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

      <PlacePicker />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="relationship">
          Who is this?
        </label>
        <select id="relationship" name="relationship" defaultValue="other" className={FIELD}>
          <option value="self">Me</option>
          <option value="partner">My partner</option>
          <option value="family">Family</option>
          <option value="friend">Friend</option>
          <option value="client">Client</option>
          <option value="public_figure">Public figure</option>
          <option value="other">Someone else</option>
        </select>
      </div>

      <input type="hidden" name="offsetMode" value="tzdb" />

      <SubmitButton pendingLabel="Casting the chart…">Add person</SubmitButton>
    </form>
  );
}
