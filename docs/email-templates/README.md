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

## Sender

The default sender is Supabase's shared address, which is rate-limited and lands
in spam often enough to matter. Point Supabase at Resend under **Project
Settings → Authentication → SMTP Settings**:

```
Host      smtp.resend.com
Port      465
Username  resend
Password  your Resend API key
Sender    jade@jadeapp.co
Name      Jade
```

The sending domain has to be verified in Resend first, or every message is
rejected. The `From` address must be on that verified domain — `gmail.com` will
not work no matter what the key says.

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
send yourself a real one from the Supabase dashboard's preview, and look at it
on a phone.
