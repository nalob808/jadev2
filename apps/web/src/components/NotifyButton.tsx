import { recordInterest } from '@/app/actions';

/**
 * "Tell me when this opens."
 *
 * No client component and no pending state, on purpose. This is a form that
 * posts once and redirects, so there is nothing for React to keep in sync and
 * nothing that can get stuck mid-submission — the failure that made the
 * rectification form single-use until it was rewritten this way.
 */
export function NotifyButton({
  wantedPlan,
  fromPlan,
  capability,
  counted,
  label,
  noted = false,
}: {
  wantedPlan: string;
  fromPlan: string;
  capability: string | null;
  counted: string | null;
  label: string;
  noted?: boolean;
}): React.ReactElement {
  if (noted) {
    return (
      <p className="border-l-2 border-[var(--jade)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed">
        <strong>Noted.</strong> You are on the list for {wantedPlan}. Nothing has been charged and
        no card has been asked for — this only records that you wanted it.
      </p>
    );
  }

  return (
    <form action={recordInterest}>
      <input type="hidden" name="wantedPlan" value={wantedPlan} />
      <input type="hidden" name="fromPlan" value={fromPlan} />
      {capability ? <input type="hidden" name="capability" value={capability} /> : null}
      {counted ? <input type="hidden" name="counted" value={counted} /> : null}
      <button
        type="submit"
        className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
      >
        {label}
      </button>
    </form>
  );
}
