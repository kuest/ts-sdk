# Unified TypeScript client

The `@market-sdk/client` package provides market data, authenticated CLOB orders, and Deposit Wallet relayer workflows. It is a local adaptation under verification.

Configure approved CLOB, WebSocket, relayer, Gamma, Data, and Polygon RPC endpoints with `forkEnvironmentConfig`. Network defaults are unconfigured. Orders use Deposit Wallet signature type 3 and the `CTF Exchange` version 2 signing domain. Position-backed V3 orders, combo RFQ, protocol V2 collateral return, and Safe/Proxy relayer submissions are rejected locally.

See the [workspace README](../../README.md) for a read-only example. The imported upstream source and MIT attribution are recorded in [UPSTREAM.md](../../UPSTREAM.md) and [LICENSE](../../LICENSE).
