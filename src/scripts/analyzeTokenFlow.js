import { Graph } from 'graphnetworkx';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Load data
const adapter = new JSONFile('../../data/graph.json');
const db = new Low(adapter, {businesses: [], users: [], events: []});
await db.read();

// Initialize graph
const graph = new Graph();

// 1. Add nodes (users + businesses)
for (const business of db.data.businesses) {
    console.log('setting node - business');
  graph.setNode(business.owner, { type: 'business', label: business.brand });
}
for (const user of db.data.users) {
    console.log('setting node - user')
  graph.setNode(user.address, { type: 'user' });
}

// 2. Add edges based on events
for (const event of db.data.events) {
  const business = db.data.businesses.find(b => b.brand === event.business);
  const from = event.type === 'Reward' ? business.owner : event.user;
  const to = event.type === 'Reward' ? event.user : business.owner;
  const edgeType = event.type.toLowerCase();

  graph.setEdge(from, to, {
    type: edgeType,
    amount: event.amount,
    token: business.tokenName
  });
}

console.log('Graph is ready');

const edges = graph.edges();

console.log('Token transfers:');
edges.forEach(e => {
    let weight = graph.edge(e);
    console.log(`${e.v} --(${weight.type} :${weight.amount} ${weight.token})--> ${e.w}`);
});

// How do tokens flow from reward to redeem

// Get all paths from business to anyone

const businessAddr = db.data.businesses[0].owner;
const paths = graph.outEdges(businessAddr);

// track business's token flow from users
console.log("paths:",  paths);

