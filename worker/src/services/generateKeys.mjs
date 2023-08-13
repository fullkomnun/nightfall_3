/* eslint-disable no-use-before-define */
import fs from 'fs';
import path from 'path';
import logger from 'common-files/utils/logger.mjs';
import downloadFile from 'common-files/utils/httputils.mjs';
import * as snarkjs from 'snarkjs';
import compile from '../utils/compile.mjs';

export default async function generateKeys({ filepath }) {
  const outputPath = `./output`;
  const circuitsPath = `./circuits`;

  const ext = path.extname(filepath);
  const circuitName = path.basename(filepath, '.circom'); // filename without '.circom'
  const circuitDir = filepath.replace(ext, '');

  fs.mkdirSync(`${outputPath}/${circuitDir}`, { recursive: true });

  logger.info({
    msg: 'Compiling circuits...',
    circuitsPath: `${circuitsPath}/${filepath}`,
    outputPath: `${outputPath}/${circuitDir}`,
    circuitName: `${circuitName}`,
  });

  await compile(`${circuitsPath}/${filepath}`, `${outputPath}/${circuitDir}`);

  logger.info('Setup...');

  const r1csInfo = await snarkjs.r1cs.info(`${outputPath}/${circuitDir}/${circuitName}.r1cs`);
  const power = Math.ceil(Math.log2(r1csInfo.nVars)).toString().padStart(2, '0');

  await downloadPowersOfTau(outputPath, power);

  logger.info('Generating keys...');
  await snarkjs.zKey.newZKey(
    `${outputPath}/${circuitDir}/${circuitName}.r1cs`,
    `${outputPath}/powersOfTau28_hez_final_${power}.ptau`,
    `${outputPath}/${circuitDir}/${circuitName}.zkey`,
  );

  logger.info('Exporting verification Key...');
  const vk = await snarkjs.zKey.exportVerificationKey(
    `${outputPath}/${circuitDir}/${circuitName}.zkey`,
  );

  logger.info('Key generation completed');

  return { vk, filepath };
}

const ongoingDownloads = new Map();

async function downloadPowersOfTau(outputPath, power) {
  const remotePath = `https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${power}.ptau`;
  if (ongoingDownloads.has(remotePath)) {
    logger.info(`Awaiting ongoing download for: ${remotePath}`);
    await ongoingDownloads.get(remotePath);
  }

  const downloadPromise = downloadFile(
    remotePath,
    `${outputPath}/powersOfTau28_hez_final_${power}.ptau`,
  );
  ongoingDownloads.set(remotePath, downloadPromise);

  try {
    await downloadPromise;
  } finally {
    ongoingDownloads.delete(remotePath);
  }
}
