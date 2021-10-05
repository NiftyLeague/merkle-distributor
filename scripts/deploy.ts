import { ethers, tenderly, run } from 'hardhat';
import { Contract } from '@ethersproject/contracts';
import fs from 'fs';
import ethProvider from 'eth-provider';

const NIFTY_DAO_SAFE = '0xd06Ae6fB7EaDe890f3e295D69A6679380C9456c1';

const targetNetwork = process.env.HARDHAT_NETWORK as string;

const getLedgerSigner = async () => {
  const frame = ethProvider('frame');
  const ledgerSigner = (await frame.request({ method: 'eth_requestAccounts' }))[0];
  const { Web3Provider } = ethers.providers;
  const provider = new Web3Provider(frame);
  return provider.getSigner(ledgerSigner);
};

const getToken = async () => {
  let token;
  const addressPath = `./NFTL/token.${targetNetwork}.address`;
  if (fs.existsSync(addressPath)) {
    const abi = JSON.parse(fs.readFileSync('./NFTL/abi.json', { encoding: 'utf8' }));
    const nftlAddress = fs.readFileSync(addressPath).toString();
    const signer = await getLedgerSigner();
    token = await ethers.getContractAt(abi, nftlAddress, signer);
    await token.deployed();
  } else {
    const Token = await ethers.getContractFactory('TestERC20');
    const initialSupply = ethers.utils.parseEther('420000000');
    token = await Token.deploy('Test Token', 'TTO', initialSupply);
  }
  return token;
};

const tenderlyVerify = async ({ contractName, contractAddress }: { contractName: string; contractAddress: string }) => {
  const tenderlyNetworks = ['kovan', 'goerli', 'mainnet', 'rinkeby', 'ropsten', 'matic', 'mumbai', 'xDai', 'POA'];

  if (tenderlyNetworks.includes(targetNetwork)) {
    console.log(` 📁 Attempting tenderly verification of ${contractName} on ${targetNetwork}`);
    await tenderly.persistArtifacts({
      name: contractName,
      address: contractAddress,
    });
    const verification = await tenderly.verify({
      name: contractName,
      address: contractAddress,
      network: targetNetwork,
    });
    return verification;
  }
  console.log(` 🧐 Contract verification not supported on ${targetNetwork}`);
};

const deployDistributor = async (token: Contract) => {
  const Distributor = await ethers.getContractFactory('MerkleDistributor', {
    ...(targetNetwork !== 'localhost' && { signer: await getLedgerSigner() }),
  });
  const tree = JSON.parse(fs.readFileSync('data/result.json', { encoding: 'utf8' }));
  console.log('token.address:', token.address);
  console.log('tree.merkleRoot:', tree.merkleRoot);
  const distributor = await Distributor.deploy(token.address, tree.merkleRoot, NIFTY_DAO_SAFE);
  console.log(` 🛰  MerkleDistributor Deployed to: ${targetNetwork} ${distributor.address}`);
  if (targetNetwork !== 'localhost') {
    await distributor.deployTransaction.wait(5);
    console.log(` 📁 Attempting etherscan verification of ${distributor.address} on ${targetNetwork}`);
    await run('verify:verify', {
      address: distributor.address,
      constructorArguments: [token.address, tree.merkleRoot, NIFTY_DAO_SAFE],
    });
    await tenderlyVerify({ contractName: 'MerkleDistributor', contractAddress: distributor.address });
  }
  return distributor;
};

const postDeploy = async (distributor: Contract, token: Contract) => {
  const { chainId } = await ethers.provider.getNetwork();
  let currentAddresses = {};
  if (fs.existsSync(`${__dirname}/../addresses.json`)) {
    currentAddresses = JSON.parse(fs.readFileSync(`${__dirname}/../addresses.json`).toString());
  }
  const newAddresses = {
    ...currentAddresses,
    [chainId]: { MerkleDistributor: distributor.address, token: token.address },
  };
  fs.writeFileSync(`${__dirname}/../addresses.json`, JSON.stringify(newAddresses));
};

async function main() {
  const token = await getToken();
  if (token) {
    const distributor = await deployDistributor(token);
    // const distributorSupply = ethers.utils.parseEther('104000000');
    // await token.mint(distributor.address, distributorSupply);
    await postDeploy(distributor, token);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
