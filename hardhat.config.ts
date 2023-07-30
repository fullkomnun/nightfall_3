import { HardhatUserConfig } from 'hardhat/types';
import '@nomicfoundation/hardhat-ethers';
// import 'hardhat-contract-sizer';
// import 'hardhat-storage-layout';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import '@nomicfoundation/hardhat-chai-matchers';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: { enabled: true },
  paths: {
    sources: './nightfall-deployer/contracts',
    tests: './test/unit/SmartContracts',
  },
  mocha: {
    timeout: 0,
  },
};

export default config;
