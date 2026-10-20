import {
  type ComboConditionId,
  toComboConditionId,
  toConditionId,
} from '@kuest/bindings';
import { expectEvmAddress } from '@kuest/types';
import { AbiFunction } from 'ox';
import { describe, expect, it } from 'vitest';
import {
  ctfMergePositionsCall,
  ctfRedeemPositionsCall,
  ctfSplitPositionCall,
  negRiskRedeemPositionsCall,
  routerConvertCall,
  routerHorizontalMergeCall,
  routerHorizontalSplitCall,
  routerMergeCall,
  routerRedeemCall,
  routerSplitCall,
} from './abis';
import { production } from './environments';
import { UserInputError } from './errors';

const ROUTER_ADDRESS = expectEvmAddress(
  '0x12121212006e4CD160D18e3f00711DA5c3372600',
);
const CONDITION_ID = toComboConditionId(
  '0x032def24bfb0c5c57fb236fac08b94236a0000000000000000000000000000',
);
// Simulates untyped JS callers that bypass the branded parser.
const YES_POSITION_CONDITION_ID =
  `${CONDITION_ID}00` as unknown as ComboConditionId;
const NO_POSITION_CONDITION_ID =
  `${CONDITION_ID}01` as unknown as ComboConditionId;

describe('deployed CTF call contracts', () => {
  const { contracts } = production;
  const conditionId = toConditionId(
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  );
  const splitAbi = AbiFunction.from(
    'function splitPosition(address,bytes32,bytes32,uint256[],uint256)',
  );
  const mergeAbi = AbiFunction.from(
    'function mergePositions(address,bytes32,bytes32,uint256[],uint256)',
  );

  it.each([
    [false, contracts.conditionalTokens],
    [true, contracts.negRiskAdapter],
  ])('targets the deployed %s CTF contract for split and merge', (_, target) => {
    const split = ctfSplitPositionCall(
      target,
      contracts.collateralToken,
      conditionId,
      42n,
    );
    const merge = ctfMergePositionsCall(
      target,
      contracts.collateralToken,
      conditionId,
      42n,
    );
    expect(split.to).toBe(target);
    expect(merge.to).toBe(target);
    expect(AbiFunction.decodeData(splitAbi, split.data)).toEqual([
      contracts.collateralToken,
      `0x${'0'.repeat(64)}`,
      conditionId,
      [1n, 2n],
      42n,
    ]);
    expect(AbiFunction.decodeData(mergeAbi, merge.data)[4]).toBe(42n);
  });

  it('encodes standard and NegRisk redemption with their distinct contract ABIs', () => {
    const standard = ctfRedeemPositionsCall(
      contracts.conditionalTokens,
      contracts.collateralToken,
      conditionId,
    );
    const negRisk = negRiskRedeemPositionsCall(
      contracts.negRiskAdapter,
      conditionId,
      [10n, 20n],
    );
    expect(standard.to).toBe(contracts.conditionalTokens);
    expect(negRisk.to).toBe(contracts.negRiskAdapter);
    expect(
      AbiFunction.decodeData(
        AbiFunction.from(
          'function redeemPositions(address,bytes32,bytes32,uint256[])',
        ),
        standard.data,
      )[3],
    ).toEqual([1n, 2n]);
    expect(
      AbiFunction.decodeData(
        AbiFunction.from('function redeemPositions(bytes32,uint256[])'),
        negRisk.data,
      ),
    ).toEqual([conditionId, [10n, 20n]]);
  });
});

describe('Router ABI helpers', () => {
  const eventId =
    '0x0211111111111111111111111111111111000300000000000000000000';

  it('encodes the Router neg-risk ABI and canonicalizes zero-padded event IDs', () => {
    const amount = 1_000_000n;
    const convertAbi = AbiFunction.from(
      'function convert(bytes29 eventId, uint16 conditionIndex, uint256 amount)',
    );
    const convertCall = routerConvertCall(ROUTER_ADDRESS, eventId, 3, amount);
    expect(convertCall.to).toBe(ROUTER_ADDRESS);
    expect(AbiFunction.decodeData(convertAbi, convertCall.data)).toEqual([
      eventId,
      3,
      amount,
    ]);
    expect(
      routerConvertCall(ROUTER_ADDRESS, `${eventId}000000`, 3, amount),
    ).toEqual(convertCall);
    for (const [name, helper] of [
      ['horizontalSplit', routerHorizontalSplitCall],
      ['horizontalMerge', routerHorizontalMergeCall],
    ] as const) {
      const call = helper(ROUTER_ADDRESS, eventId, amount);
      const abi = AbiFunction.from(
        `function ${name}(bytes29 eventId, uint256 amount)`,
      );
      expect(AbiFunction.decodeData(abi, call.data)).toEqual([eventId, amount]);
      expect(call.to).toBe(ROUTER_ADDRESS);
      expect(helper(ROUTER_ADDRESS, `${eventId}000000`, amount)).toEqual(call);
    }
  });

  it.each([
    '123',
    `${eventId}000001`,
    `${eventId}000100`,
    `${eventId}010000`,
    eventId.replace('0x02', '0x01'),
    '0x0211111111111111111111111111111111000300000000000000010000',
    '0x0211111111111111111111111111111111000100000000000000000000',
  ])('rejects non-event and invalid neg-risk IDs: %s', (invalidId) => {
    expect(() => routerConvertCall(ROUTER_ADDRESS, invalidId, 0, 1n)).toThrow(
      UserInputError,
    );
    expect(() =>
      routerHorizontalSplitCall(ROUTER_ADDRESS, invalidId, 1n),
    ).toThrow(UserInputError);
    expect(() =>
      routerHorizontalMergeCall(ROUTER_ADDRESS, invalidId, 1n),
    ).toThrow(UserInputError);
  });

  it('accepts the synthetic Other index and rejects indices outside the event', () => {
    expect(() =>
      routerConvertCall(ROUTER_ADDRESS, eventId, 0, 1n),
    ).not.toThrow();
    expect(() =>
      routerConvertCall(ROUTER_ADDRESS, eventId, 3, 1n),
    ).not.toThrow();
    for (const index of [-1, 1.5, 4, 65536, Number.NaN]) {
      expect(() =>
        routerConvertCall(ROUTER_ADDRESS, eventId, index, 1n),
      ).toThrow(UserInputError);
    }
  });

  it('preserves the full uint16 index, uint256 amount, and resolution-chain fields', () => {
    const largestEventId =
      '0x0211111111111111111111111111111111ffff000000000000000000ff';
    const amount = (1n << 256n) - 1n;
    const call = routerConvertCall(
      ROUTER_ADDRESS,
      largestEventId,
      65535,
      amount,
    );
    const abi = AbiFunction.from(
      'function convert(bytes29 eventId, uint16 conditionIndex, uint256 amount)',
    );
    expect(AbiFunction.decodeData(abi, call.data)).toEqual([
      largestEventId,
      65535,
      amount,
    ]);
  });

  it.each([
    0n,
    -1n,
    1n << 256n,
  ])('rejects invalid explicit amounts: %s', (amount) => {
    expect(() => routerConvertCall(ROUTER_ADDRESS, eventId, 0, amount)).toThrow(
      UserInputError,
    );
    expect(() =>
      routerHorizontalSplitCall(ROUTER_ADDRESS, eventId, amount),
    ).toThrow(UserInputError);
    expect(() =>
      routerHorizontalMergeCall(ROUTER_ADDRESS, eventId, amount),
    ).toThrow(UserInputError);
  });

  it.each([
    '0x012def24bfb0c5c57fb236fac08b94236a0000000000000000000000000000',
    '0x022def24bfb0c5c57fb236fac08b94236a0000000000000000000000000000',
  ])('normalizes ordinary protocol v2 condition %s', (conditionId) => {
    const canonicalConditionId = toConditionId(conditionId);
    const paddedConditionId = toConditionId(`${conditionId}00`);

    expect(routerSplitCall(ROUTER_ADDRESS, paddedConditionId, 1n)).toEqual(
      routerSplitCall(ROUTER_ADDRESS, canonicalConditionId, 1n),
    );
    expect(routerMergeCall(ROUTER_ADDRESS, paddedConditionId, 1n)).toEqual(
      routerMergeCall(ROUTER_ADDRESS, canonicalConditionId, 1n),
    );
    expect(routerRedeemCall(ROUTER_ADDRESS, paddedConditionId, 0, 1n)).toEqual(
      routerRedeemCall(ROUTER_ADDRESS, canonicalConditionId, 0, 1n),
    );
  });

  it('normalizes bytes32 combo condition wire forms before encoding', () => {
    expect(
      routerSplitCall(ROUTER_ADDRESS, YES_POSITION_CONDITION_ID, 1n),
    ).toEqual(routerSplitCall(ROUTER_ADDRESS, CONDITION_ID, 1n));
    expect(
      routerSplitCall(ROUTER_ADDRESS, NO_POSITION_CONDITION_ID, 1n),
    ).toEqual(routerSplitCall(ROUTER_ADDRESS, CONDITION_ID, 1n));

    expect(
      routerMergeCall(ROUTER_ADDRESS, YES_POSITION_CONDITION_ID, 1n),
    ).toEqual(routerMergeCall(ROUTER_ADDRESS, CONDITION_ID, 1n));
    expect(
      routerMergeCall(ROUTER_ADDRESS, NO_POSITION_CONDITION_ID, 1n),
    ).toEqual(routerMergeCall(ROUTER_ADDRESS, CONDITION_ID, 1n));

    expect(
      routerRedeemCall(ROUTER_ADDRESS, YES_POSITION_CONDITION_ID, 1, 1n),
    ).toEqual(routerRedeemCall(ROUTER_ADDRESS, CONDITION_ID, 1, 1n));
    expect(
      routerRedeemCall(ROUTER_ADDRESS, NO_POSITION_CONDITION_ID, 1, 1n),
    ).toEqual(routerRedeemCall(ROUTER_ADDRESS, CONDITION_ID, 1, 1n));
  });
});
