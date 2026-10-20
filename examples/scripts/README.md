# TypeScript examples

Start with the read-only example in the [workspace README](../../README.md). It requires explicitly configured service and Polygon RPC endpoints.

The scripts in `src/` came with the upstream SDK and are migration references. Some assume position-backed markets or realtime services that are not configured in this SDK. Do not use their trading or subscription flows with live services until each example is verified for the target operator.

Use a verified Deposit Wallet for orders and keep CLOB credentials separate from builder relayer credentials. The [SDK scope](../../docs/sdk-direction.md) lists supported operations.
