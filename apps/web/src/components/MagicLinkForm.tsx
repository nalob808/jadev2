'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const FIELD = 'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base';

/**
 * Sign in by emailed link. No password to choose, forget, or leak — which for
 * a product holding other people's birth data is the right default.
 */
export function MagicLinkForm({ appUrl }: { appUrl: string }): React.ReactElement {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setState('sending');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${appUrl}/auth/callback` },
      });
      if (sendError) throw new Error(sendError.message);
      setState('sent');
    } catch (caught) {
      setError((caught as Error).message);
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="mt-10 border-l-2 border-[var(--jade,#2C7A64)] bg-[var(--surface)] px-4 py-4">
        <p className="font-display text-2xl">Check your email</p>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          A sign-in link is on its way to <span className="font-mono">{email}</span>. It works once
          and expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="mt-3 font-mono text-[11px] underline"
        >
          use a different address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="mt-10 flex flex-col gap-3">
      <label className="text-sm" htmlFor="email">
        Sign in with your email. We&rsquo;ll send you a link — there&rsquo;s no password.
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className={FIELD}
      />
      {error ? (
        <p className="border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--paper)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-1 bg-[var(--accent)] px-4 py-2.5 font-display text-lg tracking-wide text-white disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Email me a link'}
      </button>
    </form>
  );
}
