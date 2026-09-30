import { describe, expect, it } from 'vitest';
import { hashShareToken, looksLikeShareToken, newShareToken, sameToken } from './shareToken';

describe('the share token', () => {
  it('is 256 bits of base64url, every time', () => {
    for (let i = 0; i < 200; i += 1) {
      const token = newShareToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(looksLikeShareToken(token)).toBe(true);
    }
  });

  /*
   * A weak generator is the failure that looks fine in every test that is not
   * this one. Two hundred tokens with no repeat is not proof of a CSPRNG, but a
   * collision here would be proof of the opposite.
   */
  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 500 }, () => newShareToken()));
    expect(seen.size).toBe(500);
  });

  it('hashes to something that is not the token', () => {
    const token = newShareToken();
    const hash = hashShareToken(token);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashShareToken(token)).toBe(hash);
    expect(hashShareToken(newShareToken())).not.toBe(hash);
  });

  /*
   * The cheap gate in front of the database. Everything here is something a
   * crawler or a scanner will actually send.
   */
  it('refuses anything it did not issue, without a query', () => {
    for (const raw of [
      '',
      'abc',
      '../../etc/passwd',
      'a'.repeat(42),
      'a'.repeat(44),
      `${'a'.repeat(42)}+`,
      `${'a'.repeat(42)}=`,
      `${'a'.repeat(42)}/`,
      'null',
      '%00',
    ]) {
      expect(looksLikeShareToken(raw), JSON.stringify(raw)).toBe(false);
    }
    expect(looksLikeShareToken(undefined)).toBe(false);
  });

  it('compares without leaking how far it got', () => {
    const token = newShareToken();
    expect(sameToken(token, token)).toBe(true);
    expect(sameToken(token, newShareToken())).toBe(false);
    expect(sameToken(token, `${token}x`)).toBe(false);
    expect(sameToken(token, '')).toBe(false);
  });
});
