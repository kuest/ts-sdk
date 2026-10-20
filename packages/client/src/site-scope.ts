import type { Market } from '@market-sdk/bindings/gamma';
import { UserInputError } from './errors';

const TTL_MS = 5 * 60 * 1000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const CONDITION_ID = /^0x[0-9a-fA-F]{64}$/;
const TOKEN_ID = /^(0x[0-9a-fA-F]+|\d+)$/;

type Scope = { conditionIds: Set<string>; tokenIds: Set<string> };
const cache = new Map<string, { value: Scope; expiresAt: number }>();

function collect(value: unknown, scope: Scope): void {
  if (Array.isArray(value)) {
    for (const child of value) collect(child, scope);
    return;
  }
  if (
    (typeof value === 'string' || typeof value === 'number') &&
    TOKEN_ID.test(String(value))
  ) {
    scope.tokenIds.add(String(value).toLowerCase());
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  const item = value as Record<string, unknown>;
  for (const field of ['condition_id', 'conditionId', 'conditionID', 'c']) {
    const candidate = item[field];
    if (typeof candidate === 'string' && CONDITION_ID.test(candidate)) {
      scope.conditionIds.add(candidate.toLowerCase());
    }
  }
  for (const field of ['token_id', 'tokenId', 'asset_id', 'assetId', 't']) {
    const candidate = item[field];
    if (
      (typeof candidate === 'string' || typeof candidate === 'number') &&
      TOKEN_ID.test(String(candidate))
    ) {
      scope.tokenIds.add(String(candidate).toLowerCase());
    }
  }
  for (const field of [
    'markets',
    'outcomes',
    'tokens',
    'clob_token_ids',
    'clobTokenIds',
    'outcome_assets',
    'outcomeAssets',
  ]) {
    collect(item[field], scope);
  }
}

function siteOrigin(siteUrl: string): string {
  const candidate = /^https?:\/\//i.test(siteUrl)
    ? siteUrl
    : `https://${siteUrl}`;
  const parsed = new URL(candidate);
  if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new UserInputError('invalid site_url');
  }
  return parsed.origin;
}

/** Resolve the same site event scope used by the older CLOB client. */
export async function getSiteMarketScope(siteUrl: string): Promise<Scope> {
  const origin = siteOrigin(siteUrl);
  const cached = cache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const scope: Scope = { conditionIds: new Set(), tokenIds: new Set() };
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('/api/events', `${origin}/`);
    url.searchParams.set('status', 'active');
    url.searchParams.set('includeBookmarkState', 'false');
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('offset', String(page * PAGE_LIMIT));
    const response = await fetch(url);
    if (!response.ok)
      throw new UserInputError(
        `site market scope request failed: HTTP ${response.status}`,
      );
    const events: unknown = await response.json();
    if (!Array.isArray(events))
      throw new UserInputError(
        'site-scoped market discovery expected /api/events to return an array',
      );
    collect(events, scope);
    if (events.length < PAGE_LIMIT) break;
  }
  cache.set(origin, { value: scope, expiresAt: Date.now() + TTL_MS });
  return scope;
}

export function filterSiteMarkets(markets: Market[], scope: Scope): Market[] {
  return markets.filter(
    (market) =>
      (market.conditionId !== null &&
        scope.conditionIds.has(market.conditionId.toLowerCase())) ||
      [market.outcomes.yes.tokenId, market.outcomes.no.tokenId].some(
        (token) =>
          token !== null && scope.tokenIds.has(String(token).toLowerCase()),
      ),
  );
}
