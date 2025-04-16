// scripts/simulateTransactions.js
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { getContract } from '../utils/contractLoader';
import { saveBusiness, saveUser, saveEvent } from '../dataStore';
import { getEnvValue, getSigner } from '../utils/signers';
import type { Account, AccountList, BusinessInfo } from '../types';

dotenv.config();

const provider = new ethers.JsonRpcProvider(getEnvValue('RPC_URL'));
const veltrix_signer = getSigner(provider, getEnvValue('PRIVATE_KEY'));
const factory = getContract('BusinessFactory', getEnvValue('FACTORY_ADDRESS'), veltrix_signer);

async function createBusiness(
  businessName: string, 
  owner: string, 
  tokenName: string, 
  tokenSymbol: string
): Promise<BusinessInfo> {
  const businessInfo: BusinessInfo = {
    token: '',
    rewardRouter: '',
    redeemRouter: '',
    owner: ''
  };

  try {
    const tx = await factory.createBusiness(businessName, owner, tokenName, tokenSymbol);
    const receipt = await tx.wait();

    for(const log of receipt.log) {
      const parsed:any = factory.interface.parseLog(log);
      if(parsed.name === 'BusinessCreated') {
        businessInfo.token = parsed.args.token;
        businessInfo.rewardRouter = parsed.args.rewardRouter;
        businessInfo.redeemRouter = parsed.args.redeemRouter;
        businessInfo.owner = owner;
      }
    }
  } catch(err) {
    console.log('error on creating business.');
  }
  return businessInfo;
}

async function registerBusiness(count: number): Promise<BusinessInfo[]> {
  const businesses: BusinessInfo[] = [];
  for(let i = 1; i <= count; i++) {
    const business = ethers.Wallet.createRandom();
    let bInfo = await createBusiness(`business_${i}`, business.address, `Company_${i} Token`, `CT_${i}`);
    bInfo.privateKey = business.privateKey;
    businesses.push(bInfo);
  }
  return businesses;
}

function generateUsers(count: number) {
  const users: Account[] = [];
  for (let i = 0; i < count; i++) {
    const user = ethers.Wallet.createRandom();
    users.push({address: user.address, private_key: user.privateKey})
  }
  return users;
}

async function main() {
  const businesses = await registerBusiness(3);
  const users = generateUsers(10);

  console.log(businesses);
}

main().catch(console.error);
