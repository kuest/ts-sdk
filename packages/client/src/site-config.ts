import type { BuilderCode } from '@kuest/bindings';
import type { HexString } from '@kuest/types';

/** Public settings from a downloader-generated `.sdk/site-config.json`. */
export type SiteConfig = {
  site_url: string;
  builder_mode: boolean;
  geoblock: boolean;
  builder_code: string;
  order_metadata: string;
};

export const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  site_url: '',
  builder_mode: false,
  geoblock: false,
  builder_code: '',
  order_metadata: ZERO_BYTES32,
};

/** Validate the existing CLOB bundle schema without changing its field names. */
export function parseSiteConfig(value: unknown): SiteConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('.sdk/site-config.json must be an object');
  }
  const record = value as Record<string, unknown>;
  const result = { ...DEFAULT_SITE_CONFIG };
  for (const field of ['site_url', 'builder_code', 'order_metadata'] as const) {
    if (record[field] === undefined) continue;
    if (typeof record[field] !== 'string') {
      throw new TypeError(
        `.sdk/site-config.json field ${field} must be a string`,
      );
    }
    result[field] = record[field];
  }
  for (const field of ['builder_mode', 'geoblock'] as const) {
    if (record[field] === undefined) continue;
    if (typeof record[field] !== 'boolean') {
      throw new TypeError(
        `.sdk/site-config.json field ${field} must be a boolean`,
      );
    }
    result[field] = record[field];
  }
  if (result.builder_code && !BYTES32.test(result.builder_code)) {
    throw new TypeError('builder_code must be bytes32');
  }
  if (!BYTES32.test(result.order_metadata)) {
    throw new TypeError('order_metadata must be bytes32');
  }
  if (
    result.builder_mode &&
    (!result.builder_code || result.builder_code === ZERO_BYTES32)
  ) {
    throw new TypeError('builder_mode requires a non-zero builder_code');
  }
  return result;
}

/** The personalized bundle's attribution overrides a caller-supplied order code. */
export function resolveSiteOrderContext(
  config: SiteConfig | undefined,
  builderCode: BuilderCode | undefined,
): { builderCode: BuilderCode | undefined; metadata: HexString | undefined } {
  return {
    builderCode: (config?.builder_code || builderCode) as
      | BuilderCode
      | undefined,
    metadata: config?.order_metadata as HexString | undefined,
  };
}
