import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SITE_CONFIG,
  parseSiteConfig,
  type SiteConfig,
} from './site-config';

/** Read the existing optional `.sdk/site-config.json` bundle overlay. */
export function loadSiteConfig(configPath?: string): SiteConfig {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const paths = configPath
    ? [resolve(configPath)]
    : [
        resolve(process.cwd(), '.sdk/site-config.json'),
        resolve(moduleDir, '../.sdk/site-config.json'),
        resolve(moduleDir, '../../../.sdk/site-config.json'),
      ];

  for (const path of paths) {
    let source: string;
    try {
      source = readFileSync(path, 'utf8');
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }
      throw error;
    }
    return parseSiteConfig(JSON.parse(source));
  }
  return { ...DEFAULT_SITE_CONFIG };
}
