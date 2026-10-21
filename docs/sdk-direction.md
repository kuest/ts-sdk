# Unified TypeScript SDK scope

This local workspace provides public reads, CLOB order workflows, and Deposit Wallet relayer transactions on Polygon mainnet. It is not yet ready for live trading.

- Chain ID 137, Circle USDC, and verified Conditional Tokens and exchange contracts.
- Deposit Wallet maker and signer, signature type 3, and `CTF Exchange` EIP-712 version 2.
- CLOB API key owns orders; builder credentials authorize relayer submissions separately.
- Relayer supports `WALLET` and `WALLET-CREATE`; Safe and Proxy submissions are rejected.
- Position-backed V3 orders, combo RFQ, and protocol V2 collateral return are rejected before network requests.
- HTTPS/WSS service endpoints and Polygon RPC must be provided explicitly. Defaults are unconfigured.

The public npm packages are `@kuest/sdk`, `@kuest/bindings`, and `@kuest/types`. Operator ZIPs use the neutral `@market-sdk/*` package names and may include `.sdk/site-config.json` for public operator settings. Direct GitHub and npm users provide service and RPC endpoints explicitly.

Source: [Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk) at the revision in [UPSTREAM.md](../UPSTREAM.md). See [LICENSE](../LICENSE) for the retained MIT terms.
