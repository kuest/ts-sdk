# Unified TypeScript client

The `@kuest/sdk` package provides market data, authenticated CLOB orders, and Deposit Wallet relayer workflows. Live trading has not been verified.

Configure approved CLOB, WebSocket, relayer, Gamma, Data, and Polygon RPC endpoints with `forkEnvironmentConfig`. Network defaults are unconfigured. Orders use Deposit Wallet signature type 3 and the `CTF Exchange` version 2 signing domain. Position-backed V3 orders, combo RFQ, protocol V2 collateral return, and Safe/Proxy relayer submissions are rejected locally.

See the source repository README for a read-only example. The included [LICENSE](./LICENSE) retains the upstream MIT terms; the repository's `UPSTREAM.md` records the source revision and adaptation.
