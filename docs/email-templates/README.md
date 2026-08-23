# Auth emails

Two templates, and you need both.

With passwordless sign-in, Supabase picks a **different** template depending on
whether it has seen the address before:

| Address     | Template Supabase sends | File                  |
| ----------- | ----------------------- | --------------------- |
| brand new   | **Confirm signup**      | `confirm-signup.html` |
| seen before | **Magic Link**          | `magic-link.html`     |

Styling only the magic link is the easy mistake, and it is the worse half to
miss: every person's very first sight of Jade would be Supabase's stock email.

## Where they go

Supabase dashboard → **Authentication** → **Emails** → **Templates**. Paste the
file contents into the body, and set the subject:

| Template       | Subject                  |
| -------------- | ------------------------ |
| Confirm signup | `Welcome to Jade`        |
| Magic Link     | `Your Jade sign-in link` |

Supabase substitutes `{{ .ConfirmationURL }}`, `{{ .Email }}` and
`{{ .SiteURL }}` — leave those exactly as they are.

## Sending: the three steps, in order

Supabase will not let you use these templates properly until custom SMTP is on,
and Resend will not send until the domain is verified. So the order matters —
doing them out of order produces errors that point at the wrong thing.

### 1. Verify the domain in Resend

Resend → **Domains** → **Add Domain** → `jadeapp.co`. It generates a handful of
DNS records: an SPF `TXT`, a DKIM `TXT` at a `resend._domainkey` host, usually an
`MX` on a `send.` subdomain, and optionally DMARC. The DKIM value is generated
per domain, so it has to be copied from that screen — nobody can tell you what it
will be in advance.

**Add them where the nameservers point, which is not necessarily the registrar.**
`jadeapp.co` was bought at GoDaddy but its nameservers are `ns1.vercel-dns.com`,
so DNS is served by **Vercel** and records added at GoDaddy would be ignored
completely — the most common way an afternoon disappears here.

Then:

```
python3 scripts/check-email-dns.py
```

It asks a public resolver what the world can actually see, which is a different
question from what a dashboard says it saved. Propagation is usually minutes.

### 2. Turn on custom SMTP in Supabase

Dashboard → **Authentication** → **SMTP Settings**
(`supabase.com/dashboard/project/_/auth/smtp`). Enable it and enter:

```
Host      smtp.resend.com
Port      465
Username  resend
Password  a Resend API key
Sender    jade@jadeapp.co
Name      Jade
```

The username really is the literal word `resend` — it is not your account name
or your email. The password is the API key, pasted whole.

The sender address must be on the domain you verified in step 1. A `gmail.com`
address will be refused no matter what the key says.

### 3. Raise the rate limit

Supabase's built-in email service allows **2 messages per hour** — a testing
allowance, not a product. Turning on custom SMTP raises it to **30 per hour**,
which is still low enough to bite on a busy day. It is adjusted separately under
**Authentication → Rate Limits**, and it is easy to configure SMTP correctly,
never look at that page, and be puzzled later when sign-ins start failing in
batches.

Only after step 2 is saved will the templates in this folder be the ones that
actually go out.

## Why the HTML looks like 2004

Because email clients do. The rules these files follow:

- **Tables for layout.** Outlook renders through Word, which has no flexbox, no
  grid, and no dependable float.
- **Every style inline.** Gmail strips `<style>` blocks in several contexts and
  a `<head>` is not guaranteed to survive forwarding at all.
- **No web fonts.** Barlow will not load in most clients, so the stack falls
  through to a system sans and the design is built to look right in that rather
  than to look broken without it.
- **Colour stated on every element.** A dark-mode client that inverts an
  unstyled background produces dark text on dark, and the button disappears.
- **The bare URL printed under the button.** Corporate mail scanners rewrite and
  sometimes pre-click links; the recipient needs something they can paste.

## Tone

These are transactional, not marketing. No hero image, no "Hi there!", no social
icons, no unsubscribe furniture on a sign-in email. Say who it is from, what the
button does, how long it lasts, and what to do if it was not them.

## Checking a change

`scripts/preview-emails.py` fills in the Supabase variables and writes a file
you can open in a browser. That catches layout, not client quirks — for those,
send yourself a real one and look at it on a phone.

`scripts/check-email-dns.py` checks whether the sending domain is actually
ready. It distinguishes "the record is missing" from "I could not look", which
matters: a checker that reports a network failure as a missing record sends you
off editing DNS that was already correct. `--self-test` exercises the reporting
against recorded answers with no network, and runs in CI.
