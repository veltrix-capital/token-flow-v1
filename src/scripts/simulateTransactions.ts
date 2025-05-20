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
    tokenPrice: 1,
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
        businessInfo.tokenPrice = Math.ceil(Math.random() * 5);
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
    
    await saveEvent({type: actionType, business: business.owner, user: user.address, amount, token: business.token});

    return { actionType, business: business.owner, token: business.tokenName, user: user.address, amount};
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

async function handleTransferAction(business: BusinessInfo, from: Account, to: Account, amount: number) {
  // This is only simualtion, not linked to on chain events
  await saveEvent({
    type: 'transfer',
    business: business.owner,
    token: business.token,
    from: from.address,
    to: to.address,
    amount: amount
  });
}

async function createTransferAction(count: number) {
  const users = await getUsers();
  const businesses = await getBusinesses();

  for(let i = 0; i < count; i++) {
    const user1 = users[Math.floor(Math.random() * users.length)];
    let user2 = user1;

    while(user2 == user1) {
      user2 = users[Math.floor(Math.random() * users.length)];
    }
    const business = businesses[Math.floor(Math.random() * businesses.length)];
    await handleTransferAction(
      business, 
      user1,
      user2,
      Math.floor(Math.random() * 200)
    );
    // Wait for 2 seconds before the next iteration
    if (i < count) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

async function handleSwapAction(
  fromBusiness: BusinessInfo, 
  fromUser: Account, 
  toBusiness: BusinessInfo, 
  toUser: Account, 
  fromAmount: number) {
    let amountValue = fromAmount * fromBusiness.tokenPrice;
    let receving = Math.floor(amountValue / toBusiness.tokenPrice);

    await saveEvent({
      type: 'swap',
      fromUser: fromUser.address,
      fromToken: fromBusiness.token,
      fromBusiness: fromBusiness.owner,
      fromAmount: fromAmount,
      toUser: toUser.address,
      toToken: toBusiness.token,
      toBusiness: toBusiness.owner,
      toAmount: receving
    });
  }

async function createSwapAction(count: number) {
  const users = await getUsers();
  const businesses = await getBusinesses();

  for(let i = 0; i < count; i++) {
    const user1 = users[Math.floor(Math.random() * users.length)];
    let user2 = user1;

    while(user2 == user1) {
      user2 = users[Math.floor(Math.random() * users.length)];
    }

    let business1 = businesses[Math.floor(Math.random() * businesses.length)];
    let business2 = business1;

    while(business1 === business2) {
      business2 = businesses[Math.floor(Math.random() * businesses.length)];
    }

    await handleSwapAction(
      business1,
      user1,
      business2,
      user2,
      Math.floor(Math.random() * 100) + 10
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
  // await createTransferAction(400);
  // await createSwapAction(100);
}

main().catch(console.error);
