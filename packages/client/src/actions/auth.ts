import type { ApiKey } from '@market-sdk/bindings';
import {
  type ApiKeyCreds,
  ApiKeyCredsSchema,
  ApiKeysResponseSchema,
  type BuilderApiKey,
  type BuilderApiKeyCreds,
  BuilderApiKeyCredsSchema,
  BuilderApiKeysResponseSchema,
} from '@market-sdk/bindings/clob';
import type { EvmAddress, EvmSignature } from '@market-sdk/types';
import { z } from 'zod';
import type { BaseClient, BaseSecureClient } from '../clients';
import {
  makeErrorGuard,
  RateLimitError,
  RequestAbortedError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { buildHmacSignature } from '../hmac';
import { parseRequestOptions, type RequestOptions } from '../request-options';

export type ApiKeyAuthRequest = {
  address: EvmAddress;
  nonce: number;
  signature: EvmSignature;
  timestamp: number;
};

export type CreateApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;
export const CreateApiKeyError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Creates a new API key from a signed L1 auth payload.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const creds = await createApiKey(client, request);
 * ```
 *
 * @throws {@link CreateApiKeyError}
 * Thrown on failure.
 */
export async function createApiKey(
  client: BaseClient,
  request: ApiKeyAuthRequest,
): Promise<ApiKeyCreds> {
  return client.clob.post('/auth/api-key', {
    headers: toL1Headers(request),
    schema: ApiKeyCredsSchema,
  });
}

export type DeriveApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;
export const DeriveApiKeyError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Derives an existing API key from a signed L1 auth payload.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const creds = await deriveApiKey(client, request);
 * ```
 *
 * @throws {@link DeriveApiKeyError}
 * Thrown on failure.
 */
export async function deriveApiKey(
  client: BaseClient,
  request: ApiKeyAuthRequest,
): Promise<ApiKeyCreds> {
  return client.clob.getWorkflow('/auth/derive-api-key', {
    headers: toL1Headers(request),
    schema: ApiKeyCredsSchema,
  });
}

export type CreateOrDeriveApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;
export const CreateOrDeriveApiKeyError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Creates an API key and falls back to derivation when it already exists.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const creds = await createOrDeriveApiKey(client, request);
 * ```
 *
 * @throws {@link CreateOrDeriveApiKeyError}
 * Thrown on failure.
 */
export async function createOrDeriveApiKey(
  client: BaseClient,
  request: ApiKeyAuthRequest,
): Promise<ApiKeyCreds> {
  try {
    return await createApiKey(client, request);
  } catch (error) {
    if (!(error instanceof RequestRejectedError) || error.status !== 400) {
      throw error;
    }
  }

  return deriveApiKey(client, request);
}

export type FetchApiKeysError =
  | RequestAbortedError
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const FetchApiKeysError = makeErrorGuard(
  RequestAbortedError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Fetches all API keys associated with the authenticated client.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const apiKeys = await fetchApiKeys(client);
 * ```
 *
 * @throws {@link FetchApiKeysError}
 * Thrown on failure.
 */
export async function fetchApiKeys(
  client: BaseSecureClient,
  options: RequestOptions = {},
): Promise<ApiKey[]> {
  const requestOptions = parseRequestOptions(options);
  const response = await client.secureClob.get('/auth/api-keys', {
    ...requestOptions,
    schema: ApiKeysResponseSchema,
  });

  return response;
}

export type DeleteApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;
export const DeleteApiKeyError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Deletes the authenticated API key.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * await deleteApiKey(client);
 * ```
 *
 * @throws {@link DeleteApiKeyError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function deleteApiKey(client: BaseSecureClient): Promise<void> {
  await client.secureClob.del('/auth/api-key', {
    schema: z.object({ revoked: z.literal(true) }),
  });
}

export type CreateBuilderApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;
export const CreateBuilderApiKeyError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Creates a new builder API key for the authenticated client.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const builderApiKey = await createBuilderApiKey(client, signedL1Auth);
 * ```
 *
 * @throws {@link CreateBuilderApiKeyError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function createBuilderApiKey(
  client: BaseSecureClient,
  request: ApiKeyAuthRequest,
): Promise<BuilderApiKeyCreds> {
  return client.relayer.post('/auth/builder-api-key', {
    headers: toL1Headers(request),
    schema: BuilderApiKeyCredsSchema,
  });
}

export type FetchBuilderApiKeysError =
  | RequestAbortedError
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const FetchBuilderApiKeysError = makeErrorGuard(
  RequestAbortedError,
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Fetches builder API keys associated with the authenticated client.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * const builderApiKeys = await fetchBuilderApiKeys(client);
 * ```
 *
 * @throws {@link FetchBuilderApiKeysError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function fetchBuilderApiKeys(
  client: BaseSecureClient,
  options: RequestOptions = {},
): Promise<BuilderApiKey[]> {
  if (client.supportsGasless && !client.hasBuilderApiKey) {
    throw new UserInputError(
      'Listing builder keys requires builder credentials or account L2 credentials without a relayer API key.',
    );
  }
  const requestOptions = parseRequestOptions(options);
  return client.relayer.get('/auth/builder-api-key', {
    ...requestOptions,
    headers: client.hasBuilderApiKey
      ? undefined
      : await toRelayerL2Headers(client, 'GET', '/auth/builder-api-key'),
    schema: BuilderApiKeysResponseSchema,
  });
}

export type RevokeBuilderApiKeyError =
  | RateLimitError
  | RequestRejectedError
  | SigningError
  | TransportError
  | UnexpectedResponseError;
export const RevokeBuilderApiKeyError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  SigningError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Revokes a builder API key.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @example
 * ```ts
 * await revokeBuilderApiKey(client);
 * ```
 *
 * @throws {@link RevokeBuilderApiKeyError}
 * Thrown when request signing fails, or the request is rejected, rate limited,
 * interrupted by transport issues, or returns an unexpected response.
 */
export async function revokeBuilderApiKey(client: BaseClient): Promise<void> {
  if (!client.hasBuilderApiKey) {
    throw new UserInputError(
      'Revoking a builder key requires builder credentials.',
    );
  }
  await client.relayer.del('/auth/builder-api-key', {
    schema: z.object({ revoked: z.literal(true) }),
  });
}

async function toRelayerL2Headers(
  client: BaseSecureClient,
  method: string,
  path: string,
): Promise<HeadersInit> {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    KUEST_ADDRESS: client.account.signer,
    KUEST_API_KEY: client.credentials.key,
    KUEST_PASSPHRASE: client.credentials.passphrase,
    KUEST_TIMESTAMP: `${timestamp}`,
    KUEST_SIGNATURE: await buildHmacSignature(
      client.credentials.secret,
      timestamp,
      method,
      path,
    ),
  };
}

function toL1Headers(auth: ApiKeyAuthRequest): HeadersInit {
  return {
    KUEST_ADDRESS: auth.address,
    KUEST_NONCE: `${auth.nonce}`,
    KUEST_SIGNATURE: auth.signature,
    KUEST_TIMESTAMP: `${auth.timestamp}`,
  };
}
