import { describe, expect, it } from 'vitest';
import { scrubSensitive } from './sentry.js';

describe('sentry scrubber', () => {
  it('redacts anything that looks like birth data, at any depth', () => {
    const event = {
      message: 'boom',
      extra: {
        subject: { name: 'Jade', birthTime: '10:32' },
        request: { latitude: 42.28, longitude: -83.74 },
        safe: 'keep me',
      },
    };
    const scrubbed = scrubSensitive(event) as typeof event;
    expect(scrubbed.extra.subject).toBe('[redacted]');
    expect(scrubbed.extra.request.latitude).toBe('[redacted]');
    expect(scrubbed.extra.safe).toBe('keep me');
    expect(scrubbed.message).toBe('boom');
  });

  it('survives cycles-free deep objects and arrays', () => {
    const scrubbed = scrubSensitive({ list: [{ dob: '1987-06-21' }, { ok: 1 }] }) as {
      list: Array<Record<string, unknown>>;
    };
    expect(scrubbed.list[0]!.dob).toBe('[redacted]');
    expect(scrubbed.list[1]!.ok).toBe(1);
  });
});
