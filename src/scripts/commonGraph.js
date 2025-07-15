// src/scripts/commonGraph.js
import { Graph }   from 'graphnetworkx';
import { Low }     from 'lowdb';
import { JSONFile }from 'lowdb/node';
import path        from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── load JSON “DB” ───────────────────────
const adapter = new JSONFile(
  path.join(__dirname, '../../data/graph.json')
);
const db = new Low(adapter, { businesses: [], users: [], events: [] });
await db.read();

// ── build graph ──────────────────────────
export const graph = new Graph();

// nodes
for (const biz of db.data.businesses)
  graph.setNode(biz.owner, { type: 'business', label: biz.brand });

for (const usr of db.data.users)
  graph.setNode(usr.address, { type: 'user' });

// edges
for (const ev of db.data.events) {
  const t = ev.type.toLowerCase();

  if (ev.type === 'swap') {
    // record each side of swap as its own edge
    graph.setEdge(ev.fromUser, ev.toUser,
      { type: t, token: ev.fromToken, amount: ev.fromAmount });
    graph.setEdge(ev.toUser, ev.fromUser,
      { type: t, token: ev.toToken,  amount: ev.toAmount  });
    continue;
  }

  // reward / redeem / transfer
  const map = {
    Reward : { from: ev.business, to: ev.user },
    Redeem : { from: ev.user,    to: ev.business },
    transfer: { from: ev.from,   to: ev.to }
  }[ev.type] || {};

  graph.setEdge(map.from, map.to, {
    type: t,
    token: ev.token,
    amount: ev.amount
  });
}

// expose raw data in case scripts need it
export const businesses = db.data.businesses;
export const users      = db.data.users;
export const events     = db.data.events;