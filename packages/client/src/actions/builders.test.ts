import { expect, it } from 'vitest';
import type { BaseClient } from '../clients';
import { listBuilderTrades } from './builders';

it('rejects builder-attributed trade listing before contacting the unfiltered backend', () => {
  // clob/src/routes/builder.rs::TradeQuery has no builder_code field, and
  // list_builder_trades does not filter SQL by builder.
  const client = {
    clob: {
      get: () => {
        throw new Error('network used');
      },
    },
  } as unknown as BaseClient;
  expect(() =>
    listBuilderTrades(client, { builderCode: `0x${'ab'.repeat(32)}` }),
  ).toThrow('ignores builder_code');
});
