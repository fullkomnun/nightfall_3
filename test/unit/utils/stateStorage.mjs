/* eslint-disable no-empty-function */
import hardhat from 'hardhat';
import { setStorageAt, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';

const { ethers } = hardhat;

const commitmentEscrowedSlot = 163;
const blockHashesSlot = 164;
const stakeAccountsSlot = 167;
const blockInfoSlot = 168;

export async function setCommitmentHashEscrowed(stateAddress, commitments) {
  const index = ethers.solidityPackedKeccak256(
    ['uint256', 'uint256'],
    [commitments[0], commitmentEscrowedSlot],
  );
  const commitmentEscrowed = ethers.zeroPadValue(ethers.toBeHex(Number(true)), 14);
  // eslint-disable-next-line no-await-in-loop
  await setStorageAt(stateAddress, index, commitmentEscrowed);
}

export async function setBlockInfo(
  stateAddress,
  blockHash,
  feeL2Payments = 0,
  blockClaimed = false,
) {
  const index = ethers.solidityPackedKeccak256(['uint256', 'uint256'], [blockHash, blockInfoSlot]);

  const txInfoStruct = ethers.toBeHex(
    ethers.concat([
      ethers.toBeHex(Number(blockClaimed)),
      ethers.zeroPadValue(ethers.toBeHex(feeL2Payments), 31),
    ]),
  );
  await setStorageAt(stateAddress, index, txInfoStruct);
}

export async function setStakeAccount(stateAddress, proposer, amount, challengeLocked, timeStake) {
  const index = ethers.solidityPackedKeccak256(
    ['uint256', 'uint256'],
    [proposer, stakeAccountsSlot],
  );

  const stakeAccountStruct = ethers.zeroPadValue(
    ethers.toBeHex(
      ethers.concat([
        ethers.zeroPadValue(ethers.toBeHex(timeStake), 4),
        ethers.zeroPadValue(ethers.toBeHex(challengeLocked), 14),
        ethers.zeroPadValue(ethers.toBeHex(amount), 14),
      ]),
    ),
    32,
  );

  await setStorageAt(stateAddress, index, stakeAccountStruct);
}

export async function setBlockData(
  StateInstance,
  stateAddress,
  blockHash,
  blockStake,
  proposerAddress,
) {
  const indexTime = ethers.solidityPackedKeccak256(['uint256'], [ethers.toBeHex(blockHashesSlot)]);

  const blocksL2 = await StateInstance.getNumberOfL2Blocks();
  await setStorageAt(
    stateAddress,
    ethers.toBeHex(blockHashesSlot),
    ethers.zeroPadValue(ethers.toBeHex(blocksL2 + 1n), 32),
  );
  await setStorageAt(stateAddress, indexTime, blockHash);
  await setStorageAt(
    stateAddress,
    ethers.toBeHex(BigInt(indexTime) + 1n),
    ethers.zeroPadValue(ethers.toBeHex(await time.latest()), 32),
  );
  await setStorageAt(
    stateAddress,
    ethers.toBeHex(BigInt(indexTime) + 2n),
    ethers.toBeHex(
      ethers.concat([ethers.zeroPadValue(ethers.toBeHex(blockStake), 12), proposerAddress]),
    ),
  );
}
