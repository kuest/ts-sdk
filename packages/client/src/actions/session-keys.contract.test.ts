import { WalletType } from '@market-sdk/bindings/gamma';
import { describe, expect, it, vi } from 'vitest';
import type { BaseSecureClient } from '../clients';
import { UserInputError } from '../errors';
import { SignerType } from '../wallet';
import {
  authorizeSessionKey,
  fetchSessionKeys,
  revokeSessionKey,
} from './session-keys';

describe('unsupported specialized session-key API', () => {
  it('rejects fetch, authorize and revoke before HTTP or signing', async () => {
    const get = vi.fn();
    const post = vi.fn();
    const sign = vi.fn();
    const client = {
      account: {
        walletType: WalletType.DEPOSIT_WALLET,
        signerType: SignerType.OWNER,
      },
      secureClob: { get },
      relayer: { post },
      signer: { sign },
    } as unknown as BaseSecureClient;

    const address = '0x0000000000000000000000000000000000000001';
    await expect(fetchSessionKeys(client)).rejects.toThrow(UserInputError);
    await expect(authorizeSessionKey(client, { address })).rejects.toThrow(
      UserInputError,
    );
    await expect(revokeSessionKey(client, { address })).rejects.toThrow(
      UserInputError,
    );
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });
});
