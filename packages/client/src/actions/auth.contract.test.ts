import { expectEvmAddress, expectEvmSignature } from '@market-sdk/types';
import { expect, it, vi } from 'vitest';
import type { BaseSecureClient } from '../clients';
import { ServiceClient } from '../ServiceClient';
import {
  createBuilderApiKey,
  deleteApiKey,
  fetchApiKeys,
  fetchBuilderApiKeys,
  revokeBuilderApiKey,
} from './auth';

it('uses current backend routes, auth headers, and response envelopes', async () => {
  // Sources: relayer/src/routes/auth.rs:45-76, clob/src/routes/auth.rs:23-41,
  // clob/src/routes/auth.rs:232-286 (snapshots relayer 35b335a, clob a63ec4e).
  const requests: Request[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = new Request(input);
    requests.push(request);
    const path = new URL(request.url).pathname;
    const body =
      path === '/auth/api-keys'
        ? ['clob-key']
        : path === '/auth/builder-api-key' && request.method === 'GET'
          ? ['builder-key']
          : request.method === 'DELETE'
            ? { revoked: true }
            : { apiKey: 'builder-key', secret: 'dGVzdA==', passphrase: 'p' };
    return new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    });
  });
  const client = {
    account: {
      signer: expectEvmAddress('0x1111111111111111111111111111111111111111'),
    },
    credentials: { key: 'clob-key', secret: 'dGVzdA==', passphrase: 'p' },
    hasBuilderApiKey: false,
    relayer: new ServiceClient({ root: 'https://relayer.test', fetch }),
    secureClob: new ServiceClient({ root: 'https://clob.test', fetch }),
  } as unknown as BaseSecureClient;

  expect(await fetchApiKeys(client)).toEqual(['clob-key']);
  await deleteApiKey(client);
  const builder = await createBuilderApiKey(client, {
    address: client.account.signer,
    nonce: 0,
    signature: expectEvmSignature(`0x${'11'.repeat(65)}`),
    timestamp: 1,
  });
  expect(builder.key).toBe('builder-key');
  expect(await fetchBuilderApiKeys(client)).toEqual([{ key: 'builder-key' }]);
  const revokeClient = {
    ...client,
    hasBuilderApiKey: true,
    relayer: new ServiceClient({
      root: 'https://relayer.test',
      fetch,
      resolveHeaders: async () => ({
        KUEST_BUILDER_API_KEY: 'builder-key',
        KUEST_BUILDER_PASSPHRASE: 'p',
        KUEST_BUILDER_TIMESTAMP: '1',
        KUEST_BUILDER_SIGNATURE: 'offline-signature',
      }),
    }),
  } as unknown as BaseSecureClient;
  await revokeBuilderApiKey(revokeClient);

  expect(
    requests.map(
      (request) =>
        `${request.method} ${new URL(request.url).host}${new URL(request.url).pathname}`,
    ),
  ).toEqual([
    'GET clob.test/auth/api-keys',
    'DELETE clob.test/auth/api-key',
    'POST relayer.test/auth/builder-api-key',
    'GET relayer.test/auth/builder-api-key',
    'DELETE relayer.test/auth/builder-api-key',
  ]);
  expect(requests[2]?.headers.get('KUEST_SIGNATURE')).toBeTruthy();
  expect(requests[3]?.headers.get('KUEST_API_KEY')).toBe('clob-key');
  expect(requests[3]?.headers.get('KUEST_SIGNATURE')).toBeTruthy();
  expect(requests[4]?.headers.get('KUEST_BUILDER_API_KEY')).toBe('builder-key');
});

it('rejects relayer API-key mode for builder-key listing before sending a request', async () => {
  const fetch = vi.fn();
  const client = {
    supportsGasless: true,
    hasBuilderApiKey: false,
    relayer: new ServiceClient({ root: 'https://relayer.test', fetch }),
  } as unknown as BaseSecureClient;

  await expect(fetchBuilderApiKeys(client)).rejects.toThrow(
    'Listing builder keys requires builder credentials',
  );
  expect(fetch).not.toHaveBeenCalled();
});
