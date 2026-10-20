import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BuilderCodeSchema } from '@market-sdk/bindings';
import { describe, expect, it } from 'vitest';
import { loadSiteConfig } from './node-site-config';
import {
  DEFAULT_SITE_CONFIG,
  parseSiteConfig,
  resolveSiteOrderContext,
} from './site-config';

const operatorWallet = '0x1111111111111111111111111111111111111111';
const operatorCode = `0x${'0'.repeat(24)}${operatorWallet.slice(2)}`;
const metadata = `0x${'ab'.repeat(32)}`;

describe('personalized SDK site configuration', () => {
  it('loads the existing downloader schema and overrides per-order builder attribution', () => {
    const directory = mkdtempSync(join(tmpdir(), 'market-sdk-site-'));
    try {
      const file = join(directory, 'site-config.json');
      writeFileSync(
        file,
        JSON.stringify({
          sdk: 'clob',
          language: 'typescript',
          site_url: 'operator.example',
          builder_mode: false,
          geoblock: true,
          builder_code: operatorCode,
          order_metadata: metadata,
        }),
      );
      const config = loadSiteConfig(file);
      expect(config).toEqual({
        site_url: 'operator.example',
        builder_mode: false,
        geoblock: true,
        builder_code: operatorCode,
        order_metadata: metadata,
      });
      expect(
        resolveSiteOrderContext(
          config,
          BuilderCodeSchema.parse(`0x${'cd'.repeat(32)}`),
        ),
      ).toEqual({ builderCode: operatorCode, metadata });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('leaves direct GitHub users without operator attribution when the overlay is absent', () => {
    expect(
      loadSiteConfig(join(tmpdir(), 'missing-sdk-site-config.json')),
    ).toEqual(DEFAULT_SITE_CONFIG);
    expect(resolveSiteOrderContext(undefined, undefined)).toEqual({
      builderCode: undefined,
      metadata: undefined,
    });
  });

  it('preserves the inherited zero-code override when builder mode is off', () => {
    const zeroCode = `0x${'0'.repeat(64)}`;
    const perOrderCode = BuilderCodeSchema.parse(`0x${'cd'.repeat(32)}`);
    const config = parseSiteConfig({
      builder_mode: false,
      builder_code: zeroCode,
    });
    expect(resolveSiteOrderContext(config, perOrderCode).builderCode).toBe(
      zeroCode,
    );
  });

  it('rejects malformed operator configuration before any signing', () => {
    expect(() =>
      parseSiteConfig({ builder_mode: true, builder_code: '' }),
    ).toThrow('builder_mode requires a non-zero builder_code');
    expect(() => parseSiteConfig({ builder_code: 'secret' })).toThrow(
      'builder_code must be bytes32',
    );
  });
});
