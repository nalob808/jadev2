import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * The secret in a share link.
 *
 * ## Why not a UUID
 *
 * A v4 UUID carries 122 bits and looks, to anyone who has seen one, like a
 * database key — which invites guessing at the shape of the space even when
 * guessing the value is hopeless. A share token is a password that happens to
 * live in a URL, so it is generated like one: 32 bytes from the system CSPRNG,
 * base64url so it survives being pasted into anything.
 *
 * ## Why the database never holds it
 *
 * Only the hash is stored. A token that opens a named person's birth chart
 * with no further authentication is worth the same care as a session cookie,
 * and the threat a share link introduces is precisely that this table becomes
 * interesting to read. Hashes are not links.
 *
 * The cost, stated where somebody will meet it: a practitioner who loses the
 * URL cannot be shown it again. Jade does not have it. They revoke and issue
 * another, which is one click and is also the safer habit.
 */
const TOKEN_BYTES = 32;

/** A fresh token. Return it to the caller once; it is never recoverable. */
export function newShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * What goes in the database.
 *
 * Plain SHA-256 with no salt and no stretching, deliberately. A salt would
 * prevent looking a token up at all, which is the one operation this needs, and
 * stretching defends against guessing a low-entropy secret — this one has 256
 * bits from a CSPRNG, so there is nothing to guess and nothing a work factor
 * would buy except a slower page.
 */
export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Tokens that could not have come from `newShareToken`, rejected before a query. */
const SHAPE = /^[A-Za-z0-9_-]{43}$/;

/**
 * Is this worth a database round trip?
 *
 * A crawler walking `/s/<anything>` should cost a regex, not a query. The
 * length is exactly what 32 base64url bytes produce, so anything else is not a
 * token Jade ever issued.
 */
export function looksLikeShareToken(raw: string | undefined): raw is string {
  return typeof raw === 'string' && SHAPE.test(raw);
}

/**
 * Constant-time comparison, for anywhere a token is checked against a known one.
 *
 * Not used by the lookup path — that compares hashes inside Postgres — but
 * exported so that a future caller reaching for `===` has the right thing to
 * hand instead.
 */
export function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
