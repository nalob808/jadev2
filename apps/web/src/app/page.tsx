import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!env.databaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="font-display text-5xl tracking-[0.12em]">JADE</h1>
        <p className="mt-6 text-lg text-[var(--ink-muted)]">
          Almost there — Jade just needs a database.
        </p>
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Create a free Postgres at <span className="font-mono">neon.tech</span>.
          </li>
          <li>
            Copy <span className="font-mono">.env.example</span> to{' '}
            <span className="font-mono">.env.local</span> and paste the connection string into{' '}
            <span className="font-mono">DATABASE_URL</span> and{' '}
            <span className="font-mono">DIRECT_DATABASE_URL</span>.
          </li>
          <li>
            Run <span className="font-mono">pnpm db:migrate &amp;&amp; pnpm db:seed</span>.
          </li>
        </ol>
        <p className="mt-6 text-sm text-[var(--ink-muted)]">
          The calculation core needs none of this —{' '}
          <Link className="underline" href="/legacy">
            the original prototype
          </Link>{' '}
          still runs, and <span className="font-mono">pnpm test</span> still passes.
        </p>
      </main>
    );
  }

  const session = await getSession();
  redirect(session ? '/people' : '/sign-in');
}
