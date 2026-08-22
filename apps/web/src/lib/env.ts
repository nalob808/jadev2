/**
 * Environment access, validated once and loudly.
 *
 * A missing DATABASE_URL should say so on boot, not surface as a confusing
 * driver error three screens into the app.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in — see the setup manual, chapter 07.`,
    );
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    return required('DATABASE_URL');
  },
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
  },
  /**
   * 'dev' signs you in as a local test user with no external service, so the
   * whole app runs against nothing but a database. It refuses to start in
   * production — see auth.ts.
   */
  get authMode(): 'dev' | 'supabase' {
    return process.env.AUTH_MODE === 'supabase' ? 'supabase' : 'dev';
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  get databaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL);
  },
};
