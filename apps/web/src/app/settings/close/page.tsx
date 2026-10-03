import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { Panel, Shell } from '@/components/Shell';
import { SubmitButton } from '@/components/SubmitButton';
import { closePractice } from '@/app/actions';

export const dynamic = 'force-dynamic';

/**
 * Leaving.
 *
 * ## Why this is a page and not a button
 *
 * A practitioner could delete a client and could not delete themselves, which
 * made the export the only half of constitution item 4 that was kept. The fix
 * is not a second button beside the theme toggle: an irreversible action needs
 * room to say what it removes, and a confirmation that can be typed by
 * accident is not a confirmation.
 *
 * ## The order of the page is the argument
 *
 * Export first, then the count of what goes, then the typed confirmation.
 * Somebody who arrives here angry should leave with their data whether or not
 * they go through with it, so the download sits above the delete rather than
 * in a sentence after it.
 */
export default async function ClosePracticePage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const people = await listSubjects(getDatabase(), session.workspaceId);

  return (
    <Shell email={session.email}>
      <div className="mx-auto max-w-[52rem]">
        <Link
          href="/settings"
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] underline underline-offset-4"
        >
          ← Settings
        </Link>

        <h1 className="mt-3 font-display text-[2rem] font-semibold leading-tight sm:text-[2.6rem]">
          Close this practice
        </h1>
        <p className="mt-2 max-w-[62ch] text-[var(--ink-muted)]">
          This removes everything Jade holds for you, permanently and immediately. There is no
          recovery and no grace period — a deletion that quietly keeps a copy for thirty days is not
          a deletion.
        </p>

        {/* ------------------------------------------------- take it with you */}
        <Panel className="mt-6" marked>
          <h2 className="font-display text-xl">Take your work with you first</h2>
          <p className="mt-1 max-w-[58ch] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
            One file with every person, their birth data, the life events, your notes, the sessions
            and the relationships, plus the settings profiles the charts were cast in. It is never
            gated and it is yours whether or not you go through with this.
          </p>
          <a
            href="/api/workspace/export"
            className="mt-3 inline-block border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
          >
            Download everything
          </a>
        </Panel>

        {/* --------------------------------------------------- what goes */}
        <Panel className="mt-4">
          <h2 className="font-display text-xl">What is removed</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-relaxed text-[var(--ink-muted)]">
            <li className="border-l-2 border-[var(--clay)] pl-3">
              <strong className="text-[var(--ink)]">
                {people.length} {people.length === 1 ? 'person' : 'people'}
              </strong>{' '}
              and every birth event, chart, life event and note attached to them
            </li>
            <li className="border-l-2 border-[var(--clay)] pl-3">
              Every session, prep sheet and follow-up
            </li>
            <li className="border-l-2 border-[var(--clay)] pl-3">
              Every relationship, watch and share link — any link you have given a client stops
              working
            </li>
            <li className="border-l-2 border-[var(--clay)] pl-3">
              Your settings profiles, and this account
            </li>
          </ul>
          <p className="mt-3 max-w-[58ch] text-[12.5px] leading-relaxed text-[var(--ink-faint)]">
            If you are on a paid plan, cancel it in the billing portal first. Deleting the practice
            here does not cancel a Stripe subscription, because Jade will no longer have a record to
            cancel it against.
          </p>
        </Panel>

        {/* ------------------------------------------------ the confirmation */}
        <Panel className="mt-4 border-l-2 border-l-[var(--clay)]">
          <form action={closePractice} className="flex flex-col gap-3">
            <label
              htmlFor="confirm"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]"
            >
              Type DELETE to confirm
            </label>
            {/*
              A typed word rather than a checkbox. The point is not security —
              anybody signed in can do this — it is that the hand has to agree
              with the intention, and a checkbox beside a red button does not
              require that.
            */}
            <input
              id="confirm"
              name="confirm"
              required
              autoComplete="off"
              spellCheck={false}
              className="w-full max-w-[16rem] border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2 font-mono text-[15px] tracking-[0.2em] text-[var(--ink)]"
            />
            <SubmitButton pendingLabel="Deleting…">Delete this practice permanently</SubmitButton>
          </form>
        </Panel>
      </div>
    </Shell>
  );
}
