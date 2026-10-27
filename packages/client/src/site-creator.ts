import {
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from './errors';
import { withAbort } from './request-options';

const CACHE_TTL_MS = 30 * 60 * 1000;
const WALLET = /^0x[0-9a-fA-F]{40}$/;
const cache = new Map<string, { value: string; expiresAt: number }>();
const pending = new Map<string, Promise<string>>();

function siteOrigin(siteUrl: string): string {
  try {
    const candidate = /^https?:\/\//i.test(siteUrl)
      ? siteUrl
      : `https://${siteUrl}`;
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname) {
      throw new Error('invalid URL');
    }
    return url.origin;
  } catch (error) {
    throw new UserInputError('invalid site_url for creator filtering', {
      cause: error,
    });
  }
}

async function fetchCreatorQuery(origin: string): Promise<string> {
  const endpoint = new URL('/api/allowed-market-creators', origin);
  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    throw TransportError.fromError(error);
  }
  if (!response.ok) {
    throw new TransportError(
      `creator manifest request failed: HTTP ${response.status}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new UnexpectedResponseError('invalid creator manifest JSON', {
      cause: error,
    });
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('wallets' in payload) ||
    !Array.isArray(payload.wallets)
  ) {
    throw new UnexpectedResponseError('creator manifest must contain wallets');
  }
  const wallets = [
    ...new Set(
      payload.wallets
        .filter(
          (wallet): wallet is string =>
            typeof wallet === 'string' && WALLET.test(wallet.trim()),
        )
        .map((wallet) => wallet.trim().toLowerCase()),
    ),
  ].sort();
  if (wallets.length === 0) {
    throw new UnexpectedResponseError('creator manifest has no valid wallets');
  }
  return wallets.join(',');
}

/** Resolve a configured operator's current creator wallets without a global fallback. */
export function getSiteCreatorQuery(siteUrl: string): Promise<string> {
  const origin = siteOrigin(siteUrl.trim());
  const cached = cache.get(origin);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }
  const existing = pending.get(origin);
  if (existing) return existing;

  const request = fetchCreatorQuery(origin).then((value) => {
    cache.set(origin, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  });
  pending.set(origin, request);
  void request
    .finally(() => {
      if (pending.get(origin) === request) pending.delete(origin);
    })
    .catch(() => undefined);
  return request;
}

/** Explicit creator filters remain available only on unconfigured SDK clients. */
export function resolveCreatorQuery(
  siteUrl: string | undefined,
  creator: string | undefined,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (!siteUrl?.trim()) return Promise.resolve(creator);
  if (creator !== undefined) {
    throw new UserInputError(
      'creator cannot override a configured operator site',
    );
  }
  return withAbort(getSiteCreatorQuery(siteUrl), signal);
}
