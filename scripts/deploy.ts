import { ethers } from 'hardhat';
import { Contract } from '@ethersproject/contracts';
import fs from 'fs';

const getToken = async () => {
  const Token = await ethers.getContractFactory('TestERC20');
  const initialSupply = ethers.utils.parseEther('1000000000');
  const token = await Token.deploy('Test Token', 'TTO', initialSupply);
  return token;
};

const deployDistributor = async (token: Contract) => {
  const Distributor = await ethers.getContractFactory('MerkleDistributor');
  const tree = JSON.parse(fs.readFileSync('data/result.json', { encoding: 'utf8' }));
  const distributor = await Distributor.deploy(token.address, tree.merkleRoot);
  return distributor;
};

const postDeploy = async (distributor: Contract) => {
  const { chainId } = await ethers.provider.getNetwork();
  let currentAddresses = {};
  if (fs.existsSync(`${__dirname}/../addresses.json`)) {
    currentAddresses = JSON.parse(fs.readFileSync(`${__dirname}/../addresses.json`).toString());
  }
  const newAddresses = { ...currentAddresses, [chainId]: { distributor: distributor.address } };
  fs.writeFileSync(`${__dirname}/../addresses.json`, JSON.stringify(newAddresses));
};

async function main() {
  const token = await getToken();
  const distributor = await deployDistributor(token);
  const distributorSupply = ethers.utils.parseEther('80000000');
  await token.transfer(distributor.address, distributorSupply);
  await postDeploy(distributor);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
