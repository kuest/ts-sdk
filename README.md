<h1 align="center">
  <img src="https://github.com/user-attachments/assets/0cc687fb-89c4-43fa-a056-d89c307215ad" alt="Kuest" height="96" /><br/>
  Kuest Unified TypeScript SDK
</h1>

This SDK combines market discovery, CLOB data and orders, and Deposit Wallet relayer workflows on Polygon. Kuest adapted the [upstream unified SDK](https://github.com/Polymarket/ts-sdk) for its verified contracts and services. Live trading has not been validated.

## Supported scope

- Polygon mainnet (chain ID 137), Circle USDC, Conditional Tokens, and the configured CTF and Neg Risk exchanges.
- Orders use EIP-712 `CTF Exchange` version `2`, a verified Deposit Wallet as maker and signer, signature type `3`, and a CLOB API key as the order owner.
- Relayer submissions use builder credentials and `WALLET` or `WALLET-CREATE` payloads. Nonce and transaction reads use `/nonce` and `/transaction`.
- Standard and NegRisk CTF split, merge, and redeem use the deployed Conditional Tokens and NegRiskAdapter contracts. NegRisk redeem uses the adapter's YES/NO amount ABI. These calls require the caller's relevant USDC allowance or CTF operator approval; trading approvals for the exchanges do not grant those permissions.
- RFQ is intentionally disabled for this product, including the ordinary RFQ supported by the CLOB backend. Specialized session-key management and upstream protocol V2 Router position operations reject locally.
- Position-backed V3 orders, combo RFQ, collateral return, and Safe/Proxy relayer submissions fail locally. Perps, realtime, sports, bridge, and other upstream-only services are not configured.
- Builder-attributed trade listing fails locally because the current CLOB ignores `builder_code`; see [COMPATIBILITY.md](./COMPATIBILITY.md).
- All network endpoints default to `unconfigured.invalid`. An integrator must supply approved HTTPS/WSS service URLs and a Polygon RPC URL explicitly.

Operator bundles can supply the established `.sdk/site-config.json` overlay. Direct GitHub users supply their own endpoint configuration and presentation.

## Operator bundles and direct GitHub use

The public repository has no operator wallet or `.sdk` folder. An operator ZIP may add `.sdk/site-config.json` using the established CLOB bundle schema. In Node.js, load it and pass it to the client:

```ts
import { createPublicClient, forkEnvironmentConfig } from '@market-sdk/client';
import { loadSiteConfig } from '@market-sdk/client/node';

const siteConfig = loadSiteConfig(); // Empty defaults when the overlay is absent.
const environment = forkEnvironmentConfig({
  name: 'operator',
  clob: { rest: process.env.SDK_CLOB_URL! },
  gamma: { rest: process.env.SDK_GAMMA_URL! },
  data: { rest: process.env.SDK_DATA_URL! },
  relayer: { rest: process.env.SDK_RELAYER_URL! },
  rpc: process.env.SDK_RPC_URL!,
});
const client = createPublicClient({ environment, siteConfig });
```

Pass the same `siteConfig` to `createSecureClient` for trading. A nonempty `builder_code` overrides a per-order `builderCode` before signing, even when it is the zero bytes32 value, as in the older CLOB bundles. Zero means no builder attribution. `builder_mode=true` requires a nonzero code. `order_metadata` also enters the signed order. `site_url` scopes market listings to that site's `/api/events`; `geoblock` checks the established geoblock service before posting orders. If the overlay is absent, callers may provide builder attribution per order. Endpoints always require explicit configuration. Keep API credentials and private keys outside `.sdk` and source control.

## Read-only example

```ts
import { createPublicClient, forkEnvironmentConfig } from '@market-sdk/client';

const environment = forkEnvironmentConfig({
  name: 'operator',
  clob: { rest: process.env.SDK_CLOB_URL! },
  gamma: { rest: process.env.SDK_GAMMA_URL! },
  data: { rest: process.env.SDK_DATA_URL! },
  relayer: { rest: process.env.SDK_RELAYER_URL! },
  rpc: process.env.SDK_RPC_URL!,
});

const client = createPublicClient({ environment });
const book = await client.fetchOrderBook({ assetId: process.env.SDK_TOKEN_ID! });
console.log(book);
```

Supply CLOB WebSocket URLs for streams. Signing and wallet workflows need an approved Polygon RPC endpoint. Wallet deployment requires separate builder credentials. No live transaction tests have been run.

## Local checks

With Node.js 24 and pnpm 10: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`.

## Origin and license

Imported from [Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk) at commit [`b268185c818a646a93693e09f57be323213530b9`](https://github.com/Polymarket/ts-sdk/commit/b268185c818a646a93693e09f57be323213530b9), then adapted for Kuest by Kuest. See [UPSTREAM.md](./UPSTREAM.md). Original copyright and MIT terms remain in [LICENSE](./LICENSE).
