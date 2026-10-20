/**
 * Base class for errors thrown by the SDK.
 */
export abstract class MarketSdkError extends Error {
  /**
   * Returns `true` when the provided value is a `MarketSdkError`.
   */
  static isError(error: unknown): error is MarketSdkError {
    return error instanceof MarketSdkError;
  }
}

/**
 * Error thrown when code reaches a state that should be impossible.
 */
export class InvariantError extends MarketSdkError {
  override name = 'InvariantError' as const;
}
