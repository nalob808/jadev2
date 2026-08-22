import { cookies } from 'next/headers';
import { bootstrapUser } from '@jade/db';
import { getDatabase } from './db.js';
import { env } from './env.js';

export interface Session {
  userId: string;
  workspaceId: string;
  settingsProfileId: string;
  email: string;
}

const DEV_COOKIE = 'jade_dev_user';

/**
 * Authentication.
 *
 * Two modes, chosen by AUTH_MODE:
 *
 *  - `dev`      a local cookie naming an email address. No external service,
 *               so Jade runs on a database alone. Hard-refuses in production.
 *  - `supabase` real sign-in. Phase 2 wires the session read; the provider
 *               config lives in Supabase's dashboard.
 *
 * Either way the app only ever sees a Session, so swapping providers later
 * touches this file and nothing else.
 */
export async function getSession(): Promise<Session | null> {
  if (env.authMode === 'dev') {
    if (env.isProduction) {
      throw new Error(
        'AUTH_MODE=dev cannot run in production. Set AUTH_MODE=supabase and configure the Supabase keys.',
      );
    }
    const email = (await cookies()).get(DEV_COOKIE)?.value;
    if (!email) return null;
    const bootstrapped = await bootstrapUser(getDatabase(), { email });
    return { ...bootstrapped, email };
  }

  const { createSupabaseServerClient } = await import('./supabase.js');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  const bootstrapped = await bootstrapUser(getDatabase(), {
    email: data.user.email,
    name: (data.user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
  });
  return { ...bootstrapped, email: data.user.email };
}

/** For pages that must have a session. Throws rather than rendering an empty shell. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}

export async function signInDev(email: string): Promise<void> {
  if (env.isProduction) throw new Error('Dev sign-in is disabled in production.');
  (await cookies()).set(DEV_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(DEV_COOKIE);
}
