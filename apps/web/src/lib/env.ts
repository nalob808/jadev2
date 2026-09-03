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

  /**
   * Billing.
   *
   * Every one of these is optional, and the app is fully functional without
   * them — `billingConfigured` is false, the upgrade wall keeps offering to
   * record interest instead of taking a card, and nothing imports the Stripe
   * SDK. That is deliberate: this code has to be deployable before the Stripe
   * account exists, or the pressure is to paste keys in a hurry to see whether
   * any of it works.
   *
   * The price ids are read per tier and per interval rather than as a blob, so
   * a half-configured account (monthly created, yearly not) degrades to
   * offering only what it can actually charge for.
   */
  get stripeSecretKey(): string | null {
    return process.env.STRIPE_SECRET_KEY ?? null;
  },
  get stripeWebhookSecret(): string | null {
    return process.env.STRIPE_WEBHOOK_SECRET ?? null;
  },
  get billingConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  },
  /** e.g. priceId('seeker', 'monthly') → STRIPE_PRICE_SEEKER_MONTHLY. */
  priceId(plan: string, interval: 'monthly' | 'yearly'): string | null {
    const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
    return process.env[key] ?? null;
  },
};
