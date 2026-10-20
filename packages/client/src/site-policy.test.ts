import type { Market } from '@kuest/bindings/gamma';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_CONFIG } from './site-config';
import { ensureSiteTradingAllowed } from './site-policy';
import { filterSiteMarkets, getSiteMarketScope } from './site-scope';

afterEach(() => vi.unstubAllGlobals());

describe('operator site restrictions', () => {
  it('stops an order when the configured site geoblock denies trading', async () => {
    const fetchSite = vi.fn(async () =>
      Response.json({ blocked: true, country: 'XX', region: 'YY' }),
    );
    vi.stubGlobal('fetch', fetchSite);
    const config = {
      ...DEFAULT_SITE_CONFIG,
      geoblock: true,
      site_url: 'operator.example',
    };
    await expect(ensureSiteTradingAllowed(config)).rejects.toThrow(
      'trading blocked',
    );
    expect(fetchSite).toHaveBeenCalledWith(
      'https://geoblock.kuest.com/?url=operator.example',
    );
  });

  it('keeps unrelated markets outside the site listing', async () => {
    const allowed = `0x${'ab'.repeat(32)}`;
    const other = `0x${'cd'.repeat(32)}`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          {
            markets: [{ condition_id: allowed, clob_token_ids: ['123'] }],
          },
        ]),
      ),
    );
    const scope = await getSiteMarketScope('unique-operator-scope.example');
    expect(
      filterSiteMarkets(
        [
          {
            conditionId: allowed,
            outcomes: { yes: { tokenId: null }, no: { tokenId: null } },
          },
          {
            conditionId: other,
            outcomes: { yes: { tokenId: null }, no: { tokenId: null } },
          },
        ] as Market[],
        scope,
      ),
    ).toHaveLength(1);
  });
});
