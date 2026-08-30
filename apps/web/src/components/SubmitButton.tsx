'use client';

import { useEffect, useState } from 'react';

/**
 * Submit with a pending state, without React 19's form hooks.
 *
 * `useActionState` and `useFormState` do not exist in React 18.3, which is
 * what Next 14 ships against — reaching for them fails at runtime rather than
 * at build time.
 *
 * The subtlety here is the deferral. Setting `disabled` synchronously inside
 * the click handler re-renders the button as disabled *before* the browser
 * dispatches the form submission, and the submit is silently dropped. The
 * timeout lets the submission leave first; `aria-disabled` plus pointer-events
 * prevents a second click without ever touching the `disabled` attribute.
 *
 * The second subtlety is getting *out* of the pending state. A server action
 * that redirects to the page it was submitted from does a soft navigation, and
 * React reuses this client component across it — keying the surrounding form
 * is not enough to force a remount through the RSC boundary. Left alone the
 * button reads "Saving…" forever and the form cannot be used twice without a
 * reload, which is exactly what happened on the rectification page: add one
 * life event, and the second was impossible.
 *
 * So a caller whose form stays on the page after submitting passes a
 * `resetToken` that changes when the save lands — a row count is ideal. The
 * effect clears the pending state whenever it changes, remount or no remount.
 */
export function SubmitButton({
  children,
  pendingLabel,
  resetToken,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  /**
   * Changes when the submission has landed and the form is reusable. Omit on
   * forms that navigate away, where the button is unmounted anyway.
   */
  resetToken?: string | number;
}): React.ReactElement {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [resetToken]);

  return (
    <button
      type="submit"
      aria-disabled={pending}
      onClick={() => {
        setTimeout(() => setPending(true), 0);
      }}
      className={`bg-[var(--accent)] px-4 py-2.5 font-display text-lg tracking-wide text-white ${
        pending ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
