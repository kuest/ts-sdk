import {
  type ClobAssetId,
  OrderSide,
  OrderType,
  toPositionId,
  toTokenId,
} from '@kuest/bindings';
import { AssetTypeSchema, SignatureType } from '@kuest/bindings/clob';
import { WalletType } from '@kuest/bindings/gamma';
import type { EvmAddress } from '@kuest/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetType } from '../../index';
import { SignerType } from '../../wallet';
import { resolveBalanceAllowanceAssetType } from './allowance';
import { createUnsignedOrder } from './orders';
import type { OrderDraft } from './types';

const SIGNER = '0x0000000000000000000000000000000000000001' as EvmAddress;
const DEPOSIT_WALLET =
  '0x57ffbc34de23124faeb8387fcd689d314e57accd' as EvmAddress;
const PROXY_WALLET = '0x7754536ecd85c00b2e0cf9c1aa679340d8550756' as EvmAddress;
const SAFE_WALLET = '0x766b6851a199bf91ae3fa13b1cfac5187355118f' as EvmAddress;

describe('order balance and allowance asset selection', () => {
  const ctfTokenId = toTokenId((1n << 40n).toString());
  const protocolV2PositionId = toPositionId((1n << 248n).toString());

  it('exports the Protocol V2 asset type from the client entry point', () => {
    expect(AssetType.CONDITIONAL_V2).toBe('CONDITIONAL-V2');
  });

  it.each([
    [OrderSide.BUY, ctfTokenId, 'COLLATERAL'],
    [OrderSide.BUY, protocolV2PositionId, 'COLLATERAL'],
    [OrderSide.SELL, ctfTokenId, 'CONDITIONAL'],
    [OrderSide.SELL, protocolV2PositionId, 'CONDITIONAL-V2'],
  ] as const)('selects %s %s as %s for reads and refreshes', (side, assetId, expected) => {
    const assetType = resolveBalanceAllowanceAssetType(side, assetId);

    expect(AssetTypeSchema.parse(assetType)).toBe(expected);
  });
});

describe('createUnsignedOrder', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Deposit Wallet as maker and signer with signature type 3', () => {
    const order = createUnsignedOrder(
      createOrderDraft({ wallet: DEPOSIT_WALLET }),
      {
        signer: SIGNER,
        signerType: SignerType.OWNER,
        wallet: DEPOSIT_WALLET,
        walletType: WalletType.DEPOSIT_WALLET,
      },
    );

    expect(order).toEqual(
      expect.objectContaining({
        maker: DEPOSIT_WALLET,
        signatureType: SignatureType.POLY_1271,
        signer: DEPOSIT_WALLET,
      }),
    );
  });

  it('puts operator builder and metadata into the unsigned order before signing', () => {
    const builder = `0x${'ab'.repeat(32)}`;
    const metadata = `0x${'cd'.repeat(32)}`;
    const order = createUnsignedOrder(
      {
        ...createOrderDraft({ wallet: DEPOSIT_WALLET }),
        builderCode: builder as OrderDraft['builderCode'],
        metadata: metadata as OrderDraft['metadata'],
      },
      {
        signer: SIGNER,
        signerType: SignerType.OWNER,
        wallet: DEPOSIT_WALLET,
        walletType: WalletType.DEPOSIT_WALLET,
      },
    );
    expect(order).toMatchObject({ builder, metadata });
  });

  it.each([
    [WalletType.EOA, SIGNER],
    [WalletType.POLY_PROXY, PROXY_WALLET],
    [WalletType.GNOSIS_SAFE, SAFE_WALLET],
  ] as const)('rejects unsupported wallet type %s', (walletType, wallet) => {
    expect(() =>
      createUnsignedOrder(createOrderDraft({ wallet }), {
        signer: SIGNER,
        signerType: SignerType.OWNER,
        wallet,
        walletType,
      }),
    ).toThrow('SDK orders require a Deposit Wallet');
  });

  it('generates a cryptographically random salt that fits in a safe integer', () => {
    vi.stubGlobal('crypto', {
      getRandomValues<T extends ArrayBufferView | null>(values: T): T {
        if (!(values instanceof Uint8Array)) {
          throw new TypeError('Expected Uint8Array');
        }

        values.fill(0xff);

        return values;
      },
    });

    const order = createUnsignedOrder(
      createOrderDraft({ wallet: DEPOSIT_WALLET }),
      {
        signer: SIGNER,
        signerType: SignerType.OWNER,
        wallet: DEPOSIT_WALLET,
        walletType: WalletType.DEPOSIT_WALLET,
      },
    );

    expect(order.salt).toBe((2n ** 53n - 1n).toString());
    expect(Number(order.salt)).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    expect(Number.parseInt(order.salt, 10).toString()).toBe(order.salt);
  });

  it('rejects position-backed V3 orders before signing', () => {
    const positionId = toPositionId('2');
    expect(() =>
      createUnsignedOrder(
        createOrderDraft({ assetId: positionId, wallet: DEPOSIT_WALLET }),
        {
          signer: SIGNER,
          signerType: SignerType.OWNER,
          wallet: DEPOSIT_WALLET,
          walletType: WalletType.DEPOSIT_WALLET,
        },
      ),
    ).toThrow('Position-backed V3 orders are not supported by SDK');
  });
});

type CreateOrderDraftParams = {
  assetId?: ClobAssetId;
  wallet: EvmAddress;
};

function createOrderDraft({
  assetId = toTokenId(((1n << 40n) + 1n).toString()),
  wallet,
}: CreateOrderDraftParams): OrderDraft {
  return {
    assetId,
    chainId: 137,
    exchangeAddress: '0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e' as EvmAddress,
    expiration: 0,
    funderAddress: wallet,
    offeredAmount: 1000000n,
    orderType: OrderType.GTC,
    requestedAmount: 500000n,
    side: OrderSide.BUY,
    signer: SIGNER,
  };
}
