// types.ts
export interface Account {
  address: string;
  private_key: string;
}

export interface AccountList {
  accounts: Account[];
}

export interface BusinessInfo {
  token: string;
  rewardRouter: string;
  redeemRouter: string;
  owner: string;
  privateKey: string;
  brand: string;
  tokenName: string;
}

export enum ACTION_TYPE {
  REWARD = 'Reward',
  REDEEM = 'Redeem'
};