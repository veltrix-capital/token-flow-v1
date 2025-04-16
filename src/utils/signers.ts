import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

export const getSigner = (provider: ethers.JsonRpcProvider, privateKey: string) => {
  const signer = new ethers.Wallet(privateKey, provider);
  return signer;
};

export const getEnvValue = (key: string) => {
  const address = process.env[key];
  if(!address) throw new Error(`${key} not found in .env`);
  return address;
}