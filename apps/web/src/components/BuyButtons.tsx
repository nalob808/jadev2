import { startCheckout } from '@/app/actions';

/**
 * The two ways to buy a tier.
 *
 * Rendered only when a price id for that interval actually exists, so a
 * half-configured Stripe account offers only what it can genuinely charge for
 * rather than a button that dead-ends in an error.
 *
 * The saving is computed from the two prices rather than written as copy —
 * "two months free" stops being true the moment somebody edits a number.
 */
export function BuyButtons({
  planId,
  planName,
  monthly,
  yearly,
  hasMonthlyPrice,
  hasYearlyPrice,
}: {
  planId: string;
  planName: string;
  monthly: number;
  yearly: number;
  hasMonthlyPrice: boolean;
  hasYearlyPrice: boolean;
}): React.ReactElement | null {
  if (!hasMonthlyPrice && !hasYearlyPrice) return null;

  const monthsFree = monthly > 0 ? Math.round(12 - yearly / monthly) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {hasMonthlyPrice ? (
          <form action={startCheckout}>
            <input type="hidden" name="plan" value={planId} />
            <input type="hidden" name="interval" value="monthly" />
            <button
              type="submit"
              className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
            >
              {planName} · ${monthly}/month
            </button>
          </form>
        ) : null}

        {hasYearlyPrice ? (
          <form action={startCheckout}>
            <input type="hidden" name="plan" value={planId} />
            <input type="hidden" name="interval" value="yearly" />
            <button
              type="submit"
              className="border border-[var(--rule-strong)] px-4 py-2 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              ${yearly}/year
              {monthsFree > 0 ? (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[var(--jade)]">
                  {monthsFree} months free
                </span>
              ) : null}
            </button>
          </form>
        ) : null}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        Card handled by Stripe · cancel any time
      </p>
    </div>
  );
}
