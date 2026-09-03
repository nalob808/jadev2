import type { Metadata } from 'next';
import Link from 'next/link';
import { Clause, LegalPage } from '@/components/marketing/Legal';

/**
 * Privacy policy.
 *
 * The section that matters is "How it is protected", and it is deliberately
 * more modest than a privacy policy usually is. Constitution item 4 requires
 * birth data to be encrypted at rest, and today that is true only at the
 * storage layer — the hosting provider encrypts the disks, but Jade does not
 * yet encrypt the fields themselves, so anyone holding a database connection
 * string can read a birth time in plaintext.
 *
 * The temptation here is to write "your data is encrypted" and let the reader
 * assume the stronger meaning. That would be the single most quotable false
 * sentence on the site, and it would be false in a document people rely on
 * when deciding whether to trust us with somebody else's birth certificate.
 * So it says what is actually true, and names the gap.
 *
 * WHEN FIELD-LEVEL ENCRYPTION SHIPS: update that section, and only then.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy — Jade',
  description: 'What Jade holds, why, who else sees it, and how to get it all back or delete it.',
  alternates: { canonical: 'https://jadeapp.co/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="1 September 2026"
      lede="Birth data is unusually personal — a date, a time, and a place is enough to identify somebody. This page says exactly what Jade holds, who else can see it, and what is not yet as protected as it should be."
    >
      <Clause heading="What Jade holds">
        <p>
          <strong>About you:</strong> your email address, and if you signed in with a provider, the
          name and avatar it gave us. That is the whole account record.
        </p>
        <p>
          <strong>About the people you enter:</strong> a name or label, a birth date, a birth time
          and how sure you are of it, a birthplace with its coordinates, an optional note about
          where the data came from, and any relationship you record between two of them.
        </p>
        <p>
          <strong>What you write:</strong> your notes, the tags on them, and the life events you
          enter for rectification.
        </p>
        <p>
          <strong>Technical:</strong> ordinary server logs, and error reports if something breaks.
          Birth data is never written to a log.
        </p>
        <p>
          There is no advertising, no tracking pixels, no third-party analytics following you around
          the web, and nothing is sold to anybody, ever.
        </p>
      </Clause>

      <Clause heading="Why Jade holds it">
        <p>
          To cast charts and run the techniques you asked for; to keep your workspace between
          visits; to take payment if you subscribe; and to email you about your account. Birth data
          is used for nothing else.
        </p>
        <p>
          If you are in the UK or EU: the lawful basis is performance of a contract with you for the
          account and calculations, and legitimate interests for keeping the service secure and
          working. Where you enter data about other people, you are the controller of it and Jade is
          your processor.
        </p>
      </Clause>

      <Clause heading="How it is protected, and what is not done yet">
        <p>
          Traffic is encrypted in transit. The database is hosted by a provider that encrypts its
          storage at rest, so the physical disks are protected. Every table holding your data is
          isolated at the database level by row-level security, so a mistake in the application
          cannot return another practice&rsquo;s records.
        </p>
        <p>
          <strong>What is not done yet:</strong> Jade does not currently encrypt birth data at the
          field level. That means the storage is encrypted, but anyone with legitimate access to the
          running database — which today means the operator — can read a name and a birth time in
          plain text. Field-level encryption is a stated commitment in Jade&rsquo;s own engineering
          rules and it is being built; it is named here rather than glossed over, because
          &ldquo;your data is encrypted&rdquo; would let you believe something stronger than what is
          true today.
        </p>
      </Clause>

      <Clause heading="Who else sees it">
        <p>Jade runs on services that necessarily process some of this data:</p>
        <ul className="flex flex-col gap-2">
          <li>
            <strong>Hosting and database</strong> — to run the application and store your workspace.
          </li>
          <li>
            <strong>Stripe</strong> — if you subscribe. Stripe receives your email and payment
            details; Jade never sees your card number. Stripe never receives birth data.
          </li>
          <li>
            <strong>Email delivery</strong> — for sign-in links and account messages. Receives your
            email address only.
          </li>
          <li>
            <strong>Error reporting</strong> — receives technical diagnostics. Configured not to
            receive birth data.
          </li>
        </ul>
        <p>
          No birth data is sent to any AI or machine-learning service. If that ever changes it will
          require your explicit, per-workspace consent, asked for separately — not buried in an
          update to this page.
        </p>
      </Clause>

      <Clause heading="Getting it back, and getting rid of it">
        <p>
          <strong>Export</strong> is available on every tier, including the free one, and always
          will be. Everything Jade holds about any person downloads as a file, whenever you want it.
          It is deliberately not a paid feature: your data is not leverage.
        </p>
        <p>
          <strong>Deletion</strong> is permanent. Deleting a person removes their record and their
          charts. Closing your account removes the workspace and everything in it. Backups roll off
          within 30 days.
        </p>
        <p>
          Depending on where you live you may also have the right to correct your data, object to
          processing, or complain to a regulator. Ask and it will be handled — there is no form.
        </p>
      </Clause>

      <Clause heading="How long it is kept">
        <p>
          Your workspace is kept while your account is open, and deleted when you close it. Server
          logs are kept for 30 days. Payment records are kept as long as tax law requires, which is
          typically seven years, and contain no birth data.
        </p>
      </Clause>

      <Clause heading="Children">
        <p>
          Jade is not for people under 16. If you believe a child has created an account, say so and
          it will be removed.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          Changes are dated at the top of this page. Anything that materially widens what Jade does
          with your data will be announced by email before it takes effect — and if it involves
          birth data leaving Jade, it will be asked for rather than announced.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Reply to any email from Jade and a person reads it. See also the{' '}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </Clause>
    </LegalPage>
  );
}
