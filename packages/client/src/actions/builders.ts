import type { BuilderTrade } from '@market-sdk/bindings/clob';
import type { BaseClient } from '../clients';
import {
  makeErrorGuard,
  RateLimitError,
  RequestAbortedError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import type { Paginated } from '../pagination';
import type { RequestOptions } from '../request-options';

export type ListBuilderTradesRequest =
  | {
      /** Identifier for a CTF token or Polymarket V2 position. */
      assetId?: string;
      tokenId?: never;
      after?: string;
      before?: string;
      builderCode: string;
      cursor?: string;
      id?: string;
      market?: string;
    }
  | {
      assetId?: never;
      /** @deprecated Use `assetId`. */
      tokenId?: string;
      after?: string;
      before?: string;
      builderCode: string;
      cursor?: string;
      id?: string;
      market?: string;
    };

export type ListBuilderTradesError =
  | RequestAbortedError
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const ListBuilderTradesError = makeErrorGuard(
  RequestAbortedError,
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Builder trade listing is unavailable until the CLOB can filter by builder.
 *
 * @throws {@link ListBuilderTradesError}
 * Always throws locally; the backend currently ignores `builder_code`.
 */
export function listBuilderTrades(
  _client: BaseClient,
  _request: ListBuilderTradesRequest,
  _options: RequestOptions = {},
): Paginated<BuilderTrade[]> {
  throw new UserInputError(
    'Builder trade filtering is unavailable: the CLOB /builder/trades route ignores builder_code.',
  );
}
