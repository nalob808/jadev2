# Turning on billing

Everything in the codebase is finished and tested. What remains is account
setup that only you can do, because it needs a login to Stripe.

Until you do it, nothing is broken: `billingConfigured` is false, the upgrade
wall keeps offering "tell me when this opens", and the Stripe SDK is never
loaded. You can deploy today and do this next week.

**Do the whole thing in test mode first.** Stripe's test mode is a complete
parallel universe with its own keys, products and webhooks. Card `4242 4242
4242 4242`, any future expiry, any CVC.

---

## 1. Create the products

Stripe Dashboard → **Product catalogue** → Add product. One product per tier,
two prices on each (monthly and yearly, both recurring).

| Product           | Monthly | Yearly |
| ----------------- | ------- | ------ |
| Jade Seeker       | $9      | $79    |
| Jade Practitioner | $49     | $429   |
| Jade Professional | $99     | $890   |

Only create the ones you intend to sell. **Today that is Seeker and nothing
else** — every capability on Practitioner and Professional is still unbuilt,
and a tier with no price id configured falls back to "tell me when this opens"
automatically. Adding the others later is one environment variable each.

Copy each price id (`price_...`, _not_ the product id `prod_...`).

## 2. Collect the keys

- **Secret key** — Developers → API keys → _Secret key_ (`sk_test_...`).
  Never the publishable key; this integration does not use one.
- **Webhook secret** — created in step 3.

## 3. Create the webhook endpoint

Developers → Webhooks → Add endpoint.

- **URL:** `https://jadeapp.co/api/stripe/webhook`
- **Events to send** — exactly these four, no more:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Then reveal the **Signing secret** (`whsec_...`). This is not the API key, and
using the API key here fails every signature check.

## 4. Set the environment variables

In Vercel → Project → Settings → Environment Variables. Set them for
**Production** (and Preview if you want to test there):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SEEKER_MONTHLY=price_...
STRIPE_PRICE_SEEKER_YEARLY=price_...
```

Redeploy. The wall now shows real buttons for Seeker and the honest fallback
for everything else.

## 5. Test it end to end

1. Sign up with an email you have never used, so the workspace starts on Free.
2. Hit any gate — try `/relationships`.
3. Buy Seeker with `4242 4242 4242 4242`.
4. You land on Settings, which should show **Seeker** and an **active**
   subscription with a renewal date.
5. Click **Manage billing** → Stripe's portal opens → cancel.
6. Back in Settings the status becomes **Cancelled**, and it says access
   continues until the period end. Your people and notes are all still there.

If something does not happen, Developers → Webhooks → your endpoint shows every
delivery and its response body. Every response this app returns says what it
decided, in words — `ignored — no workspace holds Stripe customer cus_...`,
and so on.

## 6. Go live

Flip Stripe out of test mode, repeat steps 1–4 with live keys (`sk_live_...`,
a new `whsec_...`, and new `price_...` ids — **live price ids differ from test
ones**), and update Vercel.

---

## Things worth knowing before you sell anything

**Grandfathered accounts are protected in code.** Your workspace, and every
other one that existed before tiers shipped, is marked
`plan_source = 'grandfathered'`. No Stripe event can change those — not a
cancellation, not a failed payment, not an accidental webhook replay. If one of
those accounts ever genuinely starts paying, move it to `'stripe'` by hand
first, deliberately.

**A failed card does not cut anyone off.** `past_due` keeps full access while
Stripe retries, which it does for about two weeks. Access ends only at
`unpaid` or `canceled`, which is where Stripe itself has given up.

**Webhook redeliveries are safe.** Every event id is claimed in `stripe_events`
before it is acted on, so a retried cancellation cannot downgrade someone who
has since resubscribed. That table is also the audit trail: it records what the
handler decided about each event, in words.

**Prices live in environment variables, not the database.** That is what stops
test-mode and live-mode price ids from ever coexisting in one table and
charging somebody nine real dollars for a test product.

**The two legal pages are a starting draft, not advice.** `/terms` and
`/privacy` are written to be honest and specific, and `/terms` carries the
never-predict rule as constitution item 6 requires. Two things need a real
answer before you take money at scale: the governing-law clause (currently
Hawaii), and whether the refund terms satisfy UK and EU statutory cancellation
rights, which those terms cannot sign away. Worth an hour of a lawyer's time.

**The privacy policy says birth data is not yet encrypted at the field level,
because it is not.** When that ships, update that section — and only then.
