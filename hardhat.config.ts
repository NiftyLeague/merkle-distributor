import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@tenderly/hardhat-tenderly';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const defaultNetwork = process.env.HARDHAT_NETWORK;

function getMnemonic() {
  try {
    return fs.readFileSync('./mnemonic.txt').toString().trim();
  } catch (e) {
    if (defaultNetwork !== 'localhost') {
      console.log(
        '☢️ WARNING: No mnemonic file created for a deploy account. Try `yarn generate` and then `yarn account`.'
      );
    }
  }
  return '';
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  defaultNetwork,
  ...(process.env.ETHERSCAN_API_KEY && {
    etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
  }),
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: getMnemonic(),
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: { optimizer: { enabled: true, runs: 10000 } },
      },
    ],
  },
};

module.exports = config;
