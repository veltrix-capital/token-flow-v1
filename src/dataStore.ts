// src/dataStore.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { Account, BusinessInfo } from './types';


interface Database {
  businesses: BusinessInfo[]
  users: Account[]
  events: any[]
}

const adapter = new JSONFile<Database>(path.join(__dirname, '../data/graph.json'));
const db = new Low<Database>(adapter, {businesses: [], users: [], events: []});

const init = async() => {
  await db.read();
}

const ready = init();

export const saveBusiness = async (business: BusinessInfo): Promise<void> => {
  await ready;

  if (!db.data!.businesses.find(b => b.redeemRouter === business.redeemRouter)) {
    db.data!.businesses.push(business);
    db.write();
  }
};

export const saveUser = async (user: Account): Promise<void> => {
  await ready;
  if (!db.data!.users.find(u => u.address === user.address)) {
    db.data!.users.push(user);
    await db.write();
  }
};

export const saveEvent = async (event: any): Promise<void> => {
  await ready;
  db.data!.events.push(event);
  await db.write();
};

export const getBusinesses = async (): Promise<BusinessInfo[]> => {
  await ready;
  return db.data!.businesses;
};

export const getBusinessByRouter = async (redeemRouter: string): Promise<BusinessInfo | undefined> => {
  await ready;
  return db.data!.businesses.find(b => b.redeemRouter === redeemRouter);
};

export const getUsers = async (): Promise<Account[]> => {
  await ready;
  return db.data!.users;
};

export const getUserByAddress = async (address: string): Promise<Account | undefined> => {
  await ready;
  return db.data!.users.find(u => u.address === address);
};

export const getEvents = async (): Promise<any[]> => {
  await ready;
  return db.data!.events;
};

export const getEventsByType = async (type: string): Promise<any[]> => {
  await ready;
  return db.data!.events.filter(e => e.type === type);
};
