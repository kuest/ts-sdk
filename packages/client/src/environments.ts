import { type EvmAddress, expectEvmAddress } from '@kuest/types';
import type { Hex } from 'ox';

export type WalletDerivationConfig = {
  depositWalletFactory: EvmAddress;
  depositWalletBeacon: EvmAddress;
  depositWalletImplementation: EvmAddress;
  proxyFactory: EvmAddress;
  proxyImplementation: EvmAddress;
  safeFactory: EvmAddress;
  safeInitCodeHash: Hex.Hex;
};

export type RestEndpoint = {
  rest: string;
  headers?: Record<string, string>;
};

export type WebSocketEndpoint = {
  ws: string;
  headers?: Record<string, string>;
};

export type ClobEndpoints = RestEndpoint & {
  market: WebSocketEndpoint;
  user: WebSocketEndpoint;
};

export type CombosEndpoints = RestEndpoint &
  WebSocketEndpoint & {
    builderGateway: RestEndpoint;
    collateralReturn: RestEndpoint;
  };

/**
 * @experimental This API may change in a breaking way in any release, including patch releases.
 */
export type PerpsEndpoints = RestEndpoint & WebSocketEndpoint;

export type EnvironmentContracts = {
  collateralToken: EvmAddress;
  conditionalTokens: EvmAddress;
  negRiskAdapter: EvmAddress;
  collateralAdapter: EvmAddress;
  negRiskCollateralAdapter: EvmAddress;
  standardExchange: EvmAddress;
  negRiskExchange: EvmAddress;
  exchangeV3: EvmAddress;
  protocolV2Router: EvmAddress;
  binaryModule: EvmAddress;
  negRiskModule: EvmAddress;
  combinatorialModule: EvmAddress;
  positionManager: EvmAddress;
  autoRedeemOperator: EvmAddress;
  safeMultisend: EvmAddress;
  relayHub: EvmAddress;
  perpsDepositContract: EvmAddress;
};

export type EnvironmentConfig = {
  name: string;
  chainId: number;
  /** @internal */
  rpc: string;
  /** @internal */
  walletDerivation: WalletDerivationConfig;
  /** @internal */
  contracts: EnvironmentContracts;
  /** @internal */
  predictions: RestEndpoint;
  /** @internal */
  clob: ClobEndpoints;
  /** @internal */
  relayer: RestEndpoint;
  /** @internal */
  gamma: RestEndpoint;
  /** @internal */
  data: RestEndpoint;
  /** @internal */
  combos: CombosEndpoints;
  /** @internal */
  perps: PerpsEndpoints;
  /** @internal */
  realtime: WebSocketEndpoint;
  /** @internal @deprecated Retained temporarily for legacy RTDS streams. */
  rtds: WebSocketEndpoint;
  /** @internal */
  sports: WebSocketEndpoint;
  /** @internal */
  relayerMaxPolls: number;
  /** @internal */
  relayerPollFrequencyMs: number;
};

type EnvironmentConfigForkEndpoint = Partial<RestEndpoint & WebSocketEndpoint>;

export type EnvironmentConfigFork = {
  name: string;
  chainId?: number;
  rpc?: string;
  walletDerivation?: Partial<WalletDerivationConfig>;
  contracts?: Partial<EnvironmentContracts>;
  predictions?: Partial<RestEndpoint>;
  clob?: Partial<RestEndpoint> & {
    market?: Partial<WebSocketEndpoint>;
    user?: Partial<WebSocketEndpoint>;
  };
  relayer?: Partial<RestEndpoint>;
  gamma?: Partial<RestEndpoint>;
  data?: Partial<RestEndpoint>;
  combos?: EnvironmentConfigForkEndpoint & {
    builderGateway?: Partial<RestEndpoint>;
    collateralReturn?: Partial<RestEndpoint>;
  };
  perps?: EnvironmentConfigForkEndpoint;
  realtime?: Partial<WebSocketEndpoint>;
  /** @deprecated Retained temporarily for legacy RTDS streams. */
  rtds?: Partial<WebSocketEndpoint>;
  sports?: Partial<WebSocketEndpoint>;
  relayerMaxPolls?: number;
  relayerPollFrequencyMs?: number;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  chainId: 137,
  rpc: 'https://unconfigured.invalid',
  walletDerivation: {
    depositWalletFactory: expectEvmAddress(
      '0x2CcdC6C5dDcd895aFcCD259F291de9b618A5cA6c',
    ),
    depositWalletBeacon: expectEvmAddress(
      '0x74a618eBdd62Ff8579A8FE94f5B888d7623b9C35',
    ),
    depositWalletImplementation: expectEvmAddress(
      '0x65507Fa36589B3b2ceD54E77999909e843691e44',
    ),
    proxyFactory: expectEvmAddress(
      '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052',
    ),
    proxyImplementation: expectEvmAddress(
      '0x44e999d5c2F66Ef0861317f9A4805AC2e90aEB4f',
    ),
    safeFactory: expectEvmAddress('0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b'),
    safeInitCodeHash:
      '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf',
  },
  contracts: {
    collateralToken: expectEvmAddress(
      '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    ),
    conditionalTokens: expectEvmAddress(
      '0x4682048725865bf17067bd85fF518527A262A9C7',
    ),
    negRiskAdapter: expectEvmAddress(
      '0xd9416E904e1ab925ad72F03F6D6ce0Aa80fd2dC5',
    ),
    collateralAdapter: expectEvmAddress(
      '0xAdA100Db00Ca00073811820692005400218FcE1f',
    ),
    negRiskCollateralAdapter: expectEvmAddress(
      '0xadA2005600Dec949baf300f4C6120000bDB6eAab',
    ),
    standardExchange: expectEvmAddress(
      '0xaa1b8dE834E16eC69C044F5300041673C968c9eF',
    ),
    negRiskExchange: expectEvmAddress(
      '0xe7FA09cA716FDf498d74AFF618d32AFeacc310aB',
    ),
    exchangeV3: expectEvmAddress('0xe3333700cA9d93003F00f0F71f8515005F6c00Aa'),
    protocolV2Router: expectEvmAddress(
      '0x12121212006e4CD160D18e3f00711DA5c3372600',
    ),
    binaryModule: expectEvmAddress(
      '0x1000008dD9001B968442c1000017eaE6E0dA00Ba',
    ),
    negRiskModule: expectEvmAddress(
      '0x200000900045e3B6259600682756002200028933',
    ),
    combinatorialModule: expectEvmAddress(
      '0x30000034706c7d8e12009dab006be20000c031a8',
    ),
    positionManager: expectEvmAddress(
      '0x006F54F7f9A22e0000CC2AB60031000000ae9fEF',
    ),
    autoRedeemOperator: expectEvmAddress(
      '0xa1200000d0002264C9a1698e001292D00E1b00af',
    ),
    safeMultisend: expectEvmAddress(
      '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
    ),
    relayHub: expectEvmAddress('0xE2a6dC9a931538adB7efFA2E1D9eC60a65735117'),
    perpsDepositContract: expectEvmAddress(
      '0xDCa4af75705dbB50f62437045afF9921947917d2',
    ),
  },
  predictions: { rest: 'https://unconfigured.invalid' },
  clob: {
    rest: 'https://unconfigured.invalid',
    market: { ws: 'wss://unconfigured.invalid/ws/market' },
    user: { ws: 'wss://unconfigured.invalid/ws/user' },
  },
  relayer: { rest: 'https://unconfigured.invalid' },
  gamma: { rest: 'https://unconfigured.invalid' },
  data: { rest: 'https://unconfigured.invalid' },
  combos: {
    rest: 'https://unconfigured.invalid',
    ws: 'wss://unconfigured.invalid/ws/rfq',
    builderGateway: {
      rest: 'https://unconfigured.invalid',
    },
    collateralReturn: {
      rest: 'https://unconfigured.invalid',
    },
  },
  perps: {
    rest: 'https://unconfigured.invalid',
    ws: 'wss://unconfigured.invalid/v1/ws',
  },
  realtime: { ws: 'wss://unconfigured.invalid/ws' },
  rtds: { ws: 'wss://unconfigured.invalid' },
  sports: { ws: 'wss://unconfigured.invalid/ws' },
  relayerMaxPolls: 100,
  relayerPollFrequencyMs: 2000,
};

/**
 * Forks an environment config from production unless a different base is passed.
 *
 * @experimental This helper is intended for advanced custom environment use,
 * not general SDK usage. Its signature may change without notice.
 */
export function forkEnvironmentConfig(
  fork: EnvironmentConfigFork,
  base: EnvironmentConfig = production,
): EnvironmentConfig {
  return {
    ...base,
    ...fork,
    walletDerivation: {
      ...base.walletDerivation,
      ...fork.walletDerivation,
    },
    contracts: {
      ...base.contracts,
      ...fork.contracts,
    },
    clob: {
      ...forkRestEndpoint(base.clob, fork.clob),
      market: forkWebSocketEndpoint(base.clob.market, fork.clob?.market),
      user: forkWebSocketEndpoint(base.clob.user, fork.clob?.user),
    },
    predictions: forkRestEndpoint(base.predictions, fork.predictions),
    relayer: forkRestEndpoint(base.relayer, fork.relayer),
    gamma: forkRestEndpoint(base.gamma, fork.gamma),
    data: forkRestEndpoint(base.data, fork.data),
    combos: {
      ...forkRestWebSocketEndpoint(base.combos, fork.combos),
      builderGateway: forkRestEndpoint(
        base.combos.builderGateway,
        fork.combos?.builderGateway,
      ),
      collateralReturn: forkRestEndpoint(
        base.combos.collateralReturn,
        fork.combos?.collateralReturn,
      ),
    },
    perps: forkRestWebSocketEndpoint(base.perps, fork.perps),
    realtime: forkWebSocketEndpoint(base.realtime, fork.realtime),
    rtds: forkWebSocketEndpoint(base.rtds, fork.rtds),
    sports: forkWebSocketEndpoint(base.sports, fork.sports),
  };
}

function forkRestEndpoint(
  base: RestEndpoint,
  fork: Partial<RestEndpoint> | undefined,
): RestEndpoint {
  return {
    ...base,
    ...fork,
    headers: forkHeaders(base.headers, fork?.headers),
  };
}

function forkWebSocketEndpoint(
  base: WebSocketEndpoint,
  fork: Partial<WebSocketEndpoint> | undefined,
): WebSocketEndpoint {
  return {
    ...base,
    ...fork,
    headers: forkHeaders(base.headers, fork?.headers),
  };
}

function forkRestWebSocketEndpoint<
  TEndpoint extends RestEndpoint & WebSocketEndpoint,
>(base: TEndpoint, fork: EnvironmentConfigForkEndpoint | undefined): TEndpoint {
  return {
    ...base,
    ...fork,
    headers: forkHeaders(base.headers, fork?.headers),
  };
}

function forkHeaders(
  base: Record<string, string> | undefined,
  fork: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (base === undefined && fork === undefined) return undefined;
  return { ...base, ...fork };
}

/** @internal */
export const preproduction = forkEnvironmentConfig({
  name: 'preproduction',
  predictions: { rest: 'https://unconfigured.invalid' },
  clob: { rest: 'https://unconfigured.invalid' },
  data: { rest: 'https://unconfigured.invalid' },
  gamma: { rest: 'https://unconfigured.invalid' },
  relayer: { rest: 'https://unconfigured.invalid' },
});
