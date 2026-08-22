'use client';

import { useState } from 'react';

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
 */
export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}): React.ReactElement {
  const [pending, setPending] = useState(false);
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
