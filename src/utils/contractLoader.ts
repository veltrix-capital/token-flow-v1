import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Create provider and signer using .env
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

/**
 * Load and return a contract instance by name.
 * @param contractName Name of the JSON file (without extension) in /contracts
 */
export const getContract = (contractName: string, address: string, signer: ethers.Signer): ethers.Contract => {
  const contractPath = path.join(__dirname, '../contracts', `${contractName}.json`);

  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found: ${contractPath}`);
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  if (!contractJson.abi) {
    throw new Error(`Contract abi missing in: ${contractPath}`);
  }

  return new ethers.Contract(address, contractJson.abi, signer);
};