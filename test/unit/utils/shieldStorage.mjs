/* eslint-disable no-empty-function */
import hardhat from 'hardhat';
import { setStorageAt } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';

const { ethers } = hardhat;

const advancedWithdrawalSlot = 164;

// eslint-disable-next-line import/prefer-default-export
export async function setAdvancedWithdrawal(
  shieldAddress,
  withdrawTransactionHash,
  liquidityProviderAddress,
  fee,
  isWithdrawn,
) {
  const indexAdvanceWithdrawal = ethers.solidityPackedKeccak256(
    ['uint256', 'uint256'],
    [withdrawTransactionHash, advancedWithdrawalSlot],
  );

  const advancedWithdrawalStruct = ethers.toBeHex(
    ethers.concat([
      ethers.toBeHex(Number(isWithdrawn)),
      ethers.zeroPadValue(ethers.toBeHex(fee), 11),
      liquidityProviderAddress,
    ]),
  );

  await setStorageAt(shieldAddress, indexAdvanceWithdrawal, advancedWithdrawalStruct);
}
