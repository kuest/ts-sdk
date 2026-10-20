import { MarketSchema, WalletType } from '@market-sdk/bindings/gamma';
import { expectEvmAddress } from '@market-sdk/types';
import { AbiFunction, AbiParameters } from 'ox';
import { describe, expect, it, vi } from 'vitest';
import type { BaseSecureClient } from '../clients';
import { production } from '../environments';
import { UserInputError } from '../errors';
import { listMarkets } from './markets';
import {
  prepareConvert,
  prepareHorizontalMerge,
  prepareHorizontalSplit,
} from './neg-risk';
import {
  prepareMergeComboPosition,
  prepareMergeMarketPosition,
  prepareRedeemMarketPositions,
  prepareRedeemPosition,
  prepareSplitComboPosition,
  prepareSplitMarketPosition,
} from './positions';

vi.mock('./markets', () => ({ listMarkets: vi.fn() }));

const conditionId = `0x${'11'.repeat(32)}`;
const wallet = expectEvmAddress('0x0000000000000000000000000000000000000001');

function clientForMarket(negRisk: boolean, version: string | null = null) {
  const market = MarketSchema.parse({
    id: '123',
    conditionId,
    version,
    outcomes: '["Yes", "No"]',
    clobTokenIds: '["101", "202"]',
    positionIds: '["301", "302"]',
    negRisk,
  });
  vi.mocked(listMarkets).mockReturnValue({
    firstPage: async () => ({ items: [market] }),
  } as ReturnType<typeof listMarkets>);
  const ethCall = vi
    .fn()
    .mockResolvedValue(
      AbiParameters.encode(AbiParameters.from('uint256[]'), [[10n, 20n]]),
    );
  const client = {
    account: { walletType: WalletType.EOA, wallet },
    environment: production,
    rpc: { ethCall },
  } as unknown as BaseSecureClient;
  return { client, ethCall };
}

describe('deployed CTF position routing', () => {
  it.each([
    [false, production.contracts.conditionalTokens],
    [true, production.contracts.negRiskAdapter],
  ])('splits a %s market at its deployed contract', async (negRisk, target) => {
    const { client, ethCall } = clientForMarket(negRisk);
    const workflow = await prepareSplitMarketPosition(client, {
      conditionId,
      amount: 42n,
    });
    const step = await workflow.next();
    expect(step.value).toMatchObject({ request: { to: target } });
    expect(ethCall).not.toHaveBeenCalled();
  });

  it('redeems standard CTF at Conditional Tokens without a balance RPC', async () => {
    const { client, ethCall } = clientForMarket(false);
    const workflow = await prepareRedeemMarketPositions(client, {
      conditionId,
    });
    const step = await workflow.next();
    expect(step.value).toMatchObject({
      request: { to: production.contracts.conditionalTokens },
    });
    expect(ethCall).not.toHaveBeenCalled();
  });

  it.each([
    [false, production.contracts.conditionalTokens],
    [true, production.contracts.negRiskAdapter],
  ])('merges a %s market through its deployed CTF contract', async (negRisk, target) => {
    const { client, ethCall } = clientForMarket(negRisk);
    const workflow = await prepareMergeMarketPosition(client, {
      conditionId,
      amount: 'max',
    });
    const step = await workflow.next();
    expect(step.value).toMatchObject({ request: { to: target } });
    expect(ethCall).toHaveBeenCalledOnce();
    expect(ethCall.mock.calls[0]?.[0].to).toBe(target);
  });

  it('redeems NegRisk YES/NO balances through its two-argument ABI', async () => {
    const { client, ethCall } = clientForMarket(true);
    const workflow = await prepareRedeemMarketPositions(client, {
      conditionId,
    });
    const step = await workflow.next();
    const request = step.value as {
      request: { to: string; data: `0x${string}` };
    };
    expect(request.request.to).toBe(production.contracts.negRiskAdapter);
    expect(
      AbiFunction.decodeData(
        AbiFunction.from('function redeemPositions(bytes32,uint256[])'),
        request.request.data,
      ),
    ).toEqual([conditionId, [10n, 20n]]);
    expect(ethCall).toHaveBeenCalledOnce();
  });

  it('rejects explicit protocol V2 market routing before RPC', async () => {
    const { client, ethCall } = clientForMarket(false, 'v2');
    await expect(
      prepareSplitMarketPosition(client, { conditionId, amount: 42n }),
    ).rejects.toThrow(UserInputError);
    expect(ethCall).not.toHaveBeenCalled();
  });

  it('rejects combo and position-ID operations before RPC', async () => {
    const { client, ethCall } = clientForMarket(false);
    await expect(
      prepareSplitComboPosition(client, { legs: ['1', '2'], amount: 1n }),
    ).rejects.toThrow(UserInputError);
    await expect(
      prepareMergeComboPosition(client, { legs: ['1', '2'], amount: 1n }),
    ).rejects.toThrow(UserInputError);
    await expect(
      prepareRedeemPosition(client, { positionId: '1' }),
    ).rejects.toThrow(UserInputError);
    const routerRequest = { conditionId, amount: 1n };
    await expect(prepareConvert(client, routerRequest)).rejects.toThrow(
      UserInputError,
    );
    await expect(prepareHorizontalSplit(client, routerRequest)).rejects.toThrow(
      UserInputError,
    );
    await expect(prepareHorizontalMerge(client, routerRequest)).rejects.toThrow(
      UserInputError,
    );
    expect(ethCall).not.toHaveBeenCalled();
  });
});
