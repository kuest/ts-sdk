import { expect, it } from 'vitest';
import { RealtimeEventSchema } from './rtds';

it('rejects removed RTDS price frames', () => {
  expect(
    RealtimeEventSchema.safeParse({
      topic: 'crypto_prices',
      type: 'update',
      timestamp: 1,
      payload: { symbol: 'btcusdt', value: 1, timestamp: 1 },
    }).success,
  ).toBe(false);
});
