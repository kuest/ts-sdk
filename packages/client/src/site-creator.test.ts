import { afterEach, expect, it, vi } from 'vitest';
import { createPublicClient } from './clients';
import { DEFAULT_SITE_CONFIG } from './site-config';
import { resolveCreatorQuery } from './site-creator';

const one = '0x1111111111111111111111111111111111111111';
const two = '0x2222222222222222222222222222222222222222';
const three = '0x3333333333333333333333333333333333333333';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('keeps the base SDK unscoped while preserving an explicit creator', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);

  await expect(
    resolveCreatorQuery(undefined, undefined),
  ).resolves.toBeUndefined();
  await expect(resolveCreatorQuery('', one)).resolves.toBe(one);
  expect(fetcher).not.toHaveBeenCalled();
});

it('isolates operator manifests, deduplicates wallets, and refreshes after the TTL', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async (url: string) => {
    const wallets = url.includes('first.example') ? [two, one, one] : [three];
    return { ok: true, json: async () => ({ wallets }) };
  });
  vi.stubGlobal('fetch', fetcher);

  await expect(resolveCreatorQuery('first.example', undefined)).resolves.toBe(
    [one, two].join(','),
  );
  await expect(
    resolveCreatorQuery('https://second.example/path', undefined),
  ).resolves.toBe(three);
  await expect(resolveCreatorQuery('first.example', undefined)).resolves.toBe(
    [one, two].join(','),
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    'https://first.example/api/allowed-market-creators',
  );
  expect(fetcher.mock.calls[1]?.[0]).toBe(
    'https://second.example/api/allowed-market-creators',
  );

  vi.advanceTimersByTime(30 * 60 * 1000 + 1);
  await resolveCreatorQuery('first.example', undefined);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('fails closed for an empty or unavailable manifest and rejects scope override', async () => {
  const fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({ wallets: [] }),
  }));
  vi.stubGlobal('fetch', fetcher);
  await expect(resolveCreatorQuery('empty.example', undefined)).rejects.toThrow(
    'no valid wallets',
  );
  await expect(resolveCreatorQuery('empty.example', undefined)).rejects.toThrow(
    'no valid wallets',
  );
  expect(fetcher).toHaveBeenCalledTimes(2);

  expect(() => resolveCreatorQuery('empty.example', one)).toThrow(
    'cannot override',
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('applies an operator manifest to market and event list and detail reads', async () => {
  const manifest = vi.fn(async (url: string) => {
    const wallets = url.includes('alpha.example') ? [one, two] : [three];
    return Response.json({ wallets });
  });
  vi.stubGlobal('fetch', manifest);

  const gammaRequests: URL[] = [];
  const gammaFetch = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(new Request(input).url);
    gammaRequests.push(url);
    if (url.pathname.endsWith('/keyset')) {
      return Response.json(
        url.pathname.includes('/markets/') ? { markets: [] } : { events: [] },
      );
    }
    return new Response(null, { status: 404 });
  });
  const alpha = createPublicClient({
    siteConfig: { ...DEFAULT_SITE_CONFIG, site_url: 'alpha.example' },
    fetch: gammaFetch,
  });
  const beta = createPublicClient({
    siteConfig: { ...DEFAULT_SITE_CONFIG, site_url: 'beta.example' },
    fetch: gammaFetch,
  });

  await alpha.listMarkets().firstPage();
  await alpha.listEvents().firstPage();
  await expect(alpha.fetchMarket({ id: '42' })).rejects.toThrow();
  await expect(alpha.fetchEvent({ slug: 'event' })).rejects.toThrow();
  await beta.listMarkets().firstPage();
  const base = createPublicClient({ fetch: gammaFetch });
  await base.listMarkets().firstPage();
  await expect(
    base.fetchEvent({ id: '42', creator: [one, two] }),
  ).rejects.toThrow();

  expect(gammaRequests.map((url) => url.searchParams.get('creator'))).toEqual([
    [one, two].join(','),
    [one, two].join(','),
    [one, two].join(','),
    [one, two].join(','),
    three,
    null,
    [one, two].join(','),
  ]);
  expect(manifest).toHaveBeenCalledTimes(2);
});
