import { OrderSide } from '@kuest/bindings';
import { createSecureClient } from '@kuest/sdk';
import { cancelOrder, fetchApiKeys } from '@kuest/sdk/actions';
import { signerFrom } from '@kuest/sdk/ethers-v5';
import { expectPresent } from '@kuest/types';
import { ethers } from 'ethers-v5';
import { polygon } from 'viem/chains';
import { describe, environment, expect, it, runMeteredTests } from './fixtures';
import { expectAcceptedOrderResponse } from './helpers';
import { findHighVolumeLowPriceMarket } from './markets';

const provider = new ethers.providers.JsonRpcProvider(environment.rpc, {
  chainId: polygon.id,
  name: polygon.name,
});

describe('ethers-v5', () => {
  it('authenticates a secure client', async ({
    depositWalletAddress,
    depositWalletPrivateKey,
  }) => {
    const secureClient = await createSecureClient({
      environment,
      wallet: depositWalletAddress,
      signer: signerFrom(new ethers.Wallet(depositWalletPrivateKey, provider)),
    });

    await expect(fetchApiKeys(secureClient)).resolves.toBeDefined();
  });

  it.runIf(runMeteredTests)(
    'places and cancels a limit order',
    async ({
      depositWalletAddress,
      depositWalletPrivateKey,
      publicClient,
      relayerAuthentication,
    }) => {
      const market = await findHighVolumeLowPriceMarket(publicClient);
      const yesTokenId = expectPresent(market.outcomes.yes.tokenId);
      const price = expectPresent(market.trading.minimumTickSize);
      const size = expectPresent(market.trading.minimumOrderSize);
      const secureClient = await createSecureClient({
        apiKey: relayerAuthentication,
        environment,
        wallet: depositWalletAddress,
        signer: signerFrom(
          new ethers.Wallet(depositWalletPrivateKey, provider),
        ),
      });

      const response = await secureClient.placeLimitOrder({
        price,
        size,
        side: OrderSide.BUY,
        tokenId: yesTokenId,
      });

      expect(response.ok).toBe(true);
      const acceptedResponse = expectAcceptedOrderResponse(response);

      await expect(
        cancelOrder(secureClient, { orderId: acceptedResponse.orderId }),
      ).resolves.toEqual(
        expect.objectContaining({
          canceled: expect.arrayContaining([acceptedResponse.orderId]),
        }),
      );
    },
  );
});
