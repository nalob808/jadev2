import type { Metadata } from 'next';
import Link from 'next/link';
import { Clause, LegalPage } from '@/components/marketing/Legal';

/**
 * Terms of service.
 *
 * Constitution item 6 requires the never-predict rule to be enforced "in the
 * interpretation layer **and** in the terms of service". The interpretation
 * layer has enforced it since Phase 6 — FORBIDDEN_TOPICS, tested. This page is
 * the other half, and section "What Jade will not do" is the operative text.
 *
 * NOTE FOR WHOEVER SHIPS THIS: written to be honest and specific rather than
 * to be maximally protective, and it has not been reviewed by a lawyer. Two
 * things need a real answer before launch: the governing-law clause, and
 * whether the refund terms match the consumer law of the places you sell into
 * (the UK and EU both grant statutory cancellation rights that these terms
 * cannot sign away).
 */
export const metadata: Metadata = {
  title: 'Terms of Service — Jade',
  description: 'The agreement between you and Jade, including what Jade will never tell you.',
  alternates: { canonical: 'https://jadeapp.co/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="1 September 2026"
      lede="Plain terms for a small product. If something here is unclear, ask — an agreement you had to decode is not one you really agreed to."
    >
      <Clause heading="Who this is between">
        <p>
          These terms are between you and Jade, the operator of jadeapp.co. Using the service means
          you accept them. If you are using Jade on behalf of a practice or a school, you confirm
          you may accept them for that organisation.
        </p>
        <p>You must be at least 16 years old to hold an account.</p>
      </Clause>

      <Clause heading="What Jade will not do">
        <p>
          <strong>
            Jade does not predict death, disease, or legal outcomes, and it never will.
          </strong>{' '}
          This is a hard product rule, not a disclaimer: the interpretation engine is built so that
          it cannot produce such statements, and the restriction is tested on every build.
        </p>
        <p>
          Astrological analysis is not medical, legal, psychiatric, or financial advice, and nothing
          Jade produces should be used in place of a doctor, a lawyer, or a licensed adviser. If you
          are worried about your health, your case, or your money, speak to someone qualified to
          help with it.
        </p>
        <p>
          You agree not to use Jade to present its output as a medical diagnosis, a legal
          prediction, or a guarantee of any outcome to another person.
        </p>
      </Clause>

      <Clause heading="Your account and the people in it">
        <p>
          You are responsible for what happens under your account, and for having a proper basis to
          hold birth data about other people. If you enter a client&rsquo;s details, that
          relationship is between you and them; Jade processes that data on your behalf.
        </p>
        <p>
          You may export everything Jade holds about any person at any time, on every tier including
          the free one, and you may delete it permanently. See the{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Clause>

      <Clause heading="Subscriptions, billing and cancellation">
        <ul className="flex flex-col gap-2">
          <li>
            Paid tiers renew automatically — monthly or yearly, whichever you chose — until you
            cancel.
          </li>
          <li>
            You can cancel at any time from Settings. Cancelling stops the next renewal; it does not
            end the period you have already paid for, and you keep your tier until that period ends.
          </li>
          <li>
            <strong>Cancelling never deletes anything.</strong> Dropping to a lower tier hides
            features. Your people, charts and notes stay exactly where they are, and come back
            untouched if you subscribe again.
          </li>
          <li>Payments are processed by Stripe. Jade never receives or stores your card number.</li>
          <li>
            If a payment fails, Stripe retries for a period before the subscription lapses. Nothing
            is switched off during those retries.
          </li>
          <li>
            Prices may change. If a price changes for a tier you are on, you will be told before it
            takes effect, and it never applies to a period you have already paid for.
          </li>
        </ul>
      </Clause>

      <Clause heading="Refunds">
        <p>
          If Jade is not what you expected, write within 14 days of a payment and it will be
          refunded. That applies to a first subscription and to a renewal you did not intend.
        </p>
        <p>
          Nothing here removes rights you have under the consumer law where you live, which in some
          countries includes a statutory right to cancel that is stronger than this paragraph.
        </p>
      </Clause>

      <Clause heading="Accuracy, and its limits">
        <p>
          Jade&rsquo;s calculations are tested against published reference data and every chart
          records the settings that produced it. Accuracy is the point of the product and errors in
          it are treated as the most serious kind of defect.
        </p>
        <p>
          That said, the service is provided as it is. Jade does not warrant that it will be
          uninterrupted, that every calculation is free of error, or that any interpretation is
          correct — astrology is a tradition of interpretation, and reasonable practitioners
          disagree. Decisions you take remain yours.
        </p>
        <p>
          To the extent the law allows, Jade&rsquo;s total liability to you for any claim is limited
          to what you paid in the twelve months before it arose.
        </p>
      </Clause>

      <Clause heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="flex flex-col gap-2">
          <li>resell or redistribute Jade&rsquo;s calculations as your own service or API;</li>
          <li>attempt to access another workspace&rsquo;s data;</li>
          <li>
            scrape, automate against, or load-test the service without asking first — ask, and the
            answer is usually yes;
          </li>
          <li>upload data you have no right to hold.</li>
        </ul>
        <p>
          Accounts used to harass, deceive, or endanger someone may be suspended. Where that
          happens, you can still export your data.
        </p>
      </Clause>

      <Clause heading="Ending it">
        <p>
          You may close your account at any time. Jade may end an account that breaks these terms,
          and will give notice and a chance to export first except where the law or somebody&rsquo;s
          safety requires otherwise.
        </p>
      </Clause>

      <Clause heading="Changes to these terms">
        <p>
          These terms may change as the product does. Material changes will be announced by email
          and by the date at the top of this page before they take effect. Continuing to use Jade
          after that means accepting them.
        </p>
      </Clause>

      <Clause heading="Governing law">
        <p>
          These terms are governed by the law of the State of Hawaii, United States, and the courts
          there have jurisdiction — except where the law of your own country gives you the right to
          bring a claim locally, which it may.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions about these terms, refunds, or your data: reply to any email from Jade, and a
          person reads it.
        </p>
      </Clause>
    </LegalPage>
  );
}
