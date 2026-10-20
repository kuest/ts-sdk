import { UserInputError } from './errors';
import type { SiteConfig } from './site-config';

const GEOBLOCK_HOST = 'https://geoblock.kuest.com';
const cachedStatuses = new WeakMap<
  SiteConfig,
  { blocked: boolean; country?: string; region?: string }
>();

/** Check the operator site's existing geoblock policy before transmitting an order. */
export async function ensureSiteTradingAllowed(
  config: SiteConfig | undefined,
): Promise<void> {
  if (!config?.geoblock) return;
  if (!config.site_url.trim()) {
    throw new UserInputError(
      'site_url must be configured when geoblock is enabled',
    );
  }

  let status = cachedStatuses.get(config);
  if (!status) {
    const response = await fetch(
      `${GEOBLOCK_HOST}/?url=${encodeURIComponent(config.site_url)}`,
    );
    if (!response.ok) {
      throw new UserInputError(
        `geoblock check failed: HTTP ${response.status}`,
      );
    }
    const payload: unknown = await response.json();
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as { blocked?: unknown }).blocked !== 'boolean'
    ) {
      throw new UserInputError('invalid geoblock response');
    }
    status = payload as { blocked: boolean; country?: string; region?: string };
    cachedStatuses.set(config, status);
  }
  if (status.blocked) {
    throw new UserInputError(
      `trading blocked for configured site_url (${config.site_url}) in ${status.country ?? 'unknown'}, ${status.region ?? 'unknown'}`,
    );
  }
}
