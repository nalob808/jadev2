import { redirect } from 'next/navigation';
import { devSignIn } from '@/app/actions';
import { getSession } from '@/lib/auth';
import { env } from '@/lib/env';
import { MagicLinkForm } from '@/components/MagicLinkForm';

export const dynamic = 'force-dynamic';

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect('/home');
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-5xl tracking-[0.12em]">JADE</h1>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        sidereal practice
      </p>

      {error ? (
        <p className="mt-6 border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--surface)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {env.authMode === 'supabase' ? (
        <MagicLinkForm appUrl={env.appUrl} />
      ) : (
        <form action={devSignIn} className="mt-10 flex flex-col gap-3">
          <label className="text-sm" htmlFor="email">
            Sign in with any email — this is local development mode, and no password is checked.
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base"
          />
          <button
            type="submit"
            className="mt-1 bg-[var(--accent)] px-4 py-2.5 font-display text-lg tracking-wide text-white"
          >
            Continue
          </button>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Development mode refuses to run in production. The deployed site uses emailed sign-in
            links.
          </p>
        </form>
      )}
    </main>
  );
}
