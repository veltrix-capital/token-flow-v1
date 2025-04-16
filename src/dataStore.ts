// src/dataStore.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

interface Business {
  id: string
  address: string
}

interface Database {
  businesses: Business[]
  users: string[]
  events: any[]
}

const adapter = new JSONFile<Database>('./data/graph.json');
const db = new Low<Database>(adapter, {businesses: [], users: [], events: []});

const init = async() => {
  await db.read();
}

const ready = init();

export const saveBusiness = async (id: string, address: string): Promise<void> => {
  await ready;

  if (!db.data!.businesses.find(b => b.address === address)) {
    db.data!.businesses.push({ id, address });
    db.write();
  }
};

export const saveUser = async (address: string): Promise<void> => {
  await ready;
  if (!db.data!.users.includes(address)) {
    db.data!.users.push(address);
    await db.write();
  }
};

export const saveEvent = async (event: any): Promise<void> => {
  await ready;
  db.data!.events.push(event);
  await db.write();
};
