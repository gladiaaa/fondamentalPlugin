import type { ErrorEvent } from '@sentry/node';
import { scrubSentryEvent } from './sentry.js';

describe('scrubSentryEvent', () => {
  it('retire les cookies et les en-têtes sensibles', () => {
    const event = {
      request: {
        cookies: { 'fp-session': 'abc' },
        headers: {
          Authorization: 'Bearer secret',
          Cookie: '__Host-session=abc',
          'x-csrf-token': 'jeton',
          'user-agent': 'test',
        },
      },
    } as unknown as ErrorEvent;
    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.headers).toEqual({ 'user-agent': 'test' });
  });

  it("ne plante pas sans requête dans l'événement", () => {
    expect(scrubSentryEvent({} as ErrorEvent)).toEqual({});
  });
});
