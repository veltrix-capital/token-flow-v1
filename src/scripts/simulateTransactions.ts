// scripts/simulateTransactions.js
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { getContract } from '../utils/contractLoader';
import { saveBusiness, saveUser, saveEvent, getUsers, getBusinesses } from '../dataStore';
import { getEnvValue, getSigner } from '../utils/signers';
import { ACTION_TYPE } from '../types';
import type { Account, AccountList, BusinessInfo } from '../types';

dotenv.config();

const provider = new ethers.JsonRpcProvider(getEnvValue('RPC_URL'));
const veltrix_signer = getSigner(provider, getEnvValue('PRIVATE_KEY'));
const factory = getContract('BusinessFactory', getEnvValue('FACTORY_ADDRESS'), veltrix_signer);
const accounts: AccountList = JSON.parse(fs.readFileSync(path.join(__dirname, '../contracts/accounts.json'), 'utf8'));

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
    owner: '',
    privateKey: '',
    brand: '',
    tokenName: '',
  };

  try {
    const tx = await factory.createBusiness(businessName, owner, tokenName, tokenSymbol);
    const receipt = await tx.wait();
    for(const log of receipt.logs) {
      const parsed:any = factory.interface.parseLog(log);
      
      if(parsed.name === 'BusinessCreated') {
        businessInfo.token = parsed.args.token;
        businessInfo.rewardRouter = parsed.args.rewardRouter;
        businessInfo.redeemRouter = parsed.args.redeemRouter;
        businessInfo.owner = owner;
        businessInfo.brand = businessName;
        businessInfo.tokenName = tokenName;
      }
    }
  } catch(err) {
    console.log('error on creating business.', err);
  }
  return businessInfo;
}

async function registerBusiness(count: number): Promise<BusinessInfo[]> {
  const businesses: BusinessInfo[] = [];  
  for(let i = 1; i <= count; i++) {
    console.log(`creating business [${i}]`);
    const business = accounts.accounts[i + 2];
    let bInfo = await createBusiness(`business_${i}`, business.address, `Company_${i} Token`, `CT_${i}`);
    bInfo.privateKey = business.private_key;
    businesses.push(bInfo);
    await saveBusiness(bInfo);
    // Wait for 2 seconds before the next iteration
    if (i < count) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return businesses;
}

async function generateUsers(count: number): Promise<Account[]> {
  const users: Account[] = [];
  for (let i = 0; i < count; i++) {
    const user = ethers.Wallet.createRandom();
    users.push({address: user.address, private_key: user.privateKey});
    await saveUser({address: user.address, private_key: user.privateKey});
  }
  return users;
}

async function handleLoayltyAction(actionType: string, business: BusinessInfo, user: Account, amount: number) {
  const simulation = true;

  const parsedAmount = ethers.parseUnits(amount.toString(), 18);
  const businessSigner = getSigner(provider, business.privateKey);
  const handlerAddress = actionType == ACTION_TYPE.REWARD ? business.rewardRouter : business.redeemRouter;
  const handlerContract = getContract(`${actionType}Router`, handlerAddress, businessSigner);

  const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint256'],
    [business.token, user.address, parsedAmount]
  );

  try {
    if(!simulation) {
      if(actionType == ACTION_TYPE.REDEEM) {
        // approve user to burn token
        const userSigner = new ethers.Wallet(user.private_key, provider);
        const abi = [
          "function approve(address spender, uint256 amount) public returns (bool)"
        ];
        const token = new ethers.Contract(business.token, abi, userSigner);
        const txApproval = await token.approve(business.redeemRouter, parsedAmount);
        console.log(`[${business.brand}]: User [${user.address}] token approval [${business.tokenName}]`);
        await txApproval.wait();
      }
      const tx = await handlerContract.handle('token', encodedData);
      console.log(`[${business.brand}]: Action[${actionType}] ${amount} (${business.tokenName}) to User [${user.address}]`);
      const receipt = await tx.wait();
    }
    
    await saveEvent({type: actionType, business: business.brand, user: user.address, amount});

    return { actionType, business: business.brand, token: business.tokenName, user: user.address, amount};
  } catch(err) {
    console.log('err', err);
    return {};
  }
}

async function createBulkTransactions(type: ACTION_TYPE, count: number) {
  const users = await getUsers();
  const businesses = await getBusinesses();

  for(let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const business = businesses[Math.floor(Math.random() * businesses.length)];
    await handleLoayltyAction(
      type,
      business, 
      user,
      Math.floor(Math.random() * 200)
    );
    // Wait for 2 seconds before the next iteration
    if (i < count) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

async function createBusinessAndUsers() {
  await registerBusiness(3);
  await generateUsers(10);
}
async function main() {
  // await createBusinessAndUsers();
  
  await createBulkTransactions(ACTION_TYPE.REWARD, 300);
  await createBulkTransactions(ACTION_TYPE.REDEEM, 300);
  // console.log('action type', ACTION_TYPE.REWARD);
  
}

main().catch(console.error);
