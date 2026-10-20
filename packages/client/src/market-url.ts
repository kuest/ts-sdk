import { UserInputError } from './errors';

type MarketUrlResource = 'event' | 'market';

export function parseMarketSlugUrl(
  rawUrl: string,
  resource: MarketUrlResource,
): string {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch (cause) {
    throw new UserInputError('Expected a valid HTTPS market URL.', { cause });
  }

  if (url.protocol !== 'https:' || !url.hostname) {
    throw new UserInputError('Expected a valid HTTPS market URL.');
  }

  const [actualResource, slug, ...extraSegments] = url.pathname
    .split('/')
    .filter(Boolean);
  const marketSlug = extraSegments[0];

  if (
    resource === 'market' &&
    actualResource === 'event' &&
    slug !== undefined &&
    extraSegments.length <= 1
  ) {
    return marketSlug ?? slug;
  }

  if (
    actualResource !== resource ||
    slug === undefined ||
    extraSegments.length > 0
  ) {
    throw new UserInputError(`Expected a ${resource} URL.`);
  }

  return slug;
}
