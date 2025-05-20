import { Graph } from 'graphnetworkx';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data
const adapter = new JSONFile(path.join(__dirname, '../../data/graph.json'));
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
  let fromBusiness, toBusiness = null;

  switch(event.type) {
    case 'Reward':
      fromBusiness = db.data.businesses.find(b => b.owner === event.business);
      graph.setEdge(fromBusiness.owner, event.user, {
        type: event.type.toLowerCase(),
        amount: event.amount,
        token: fromBusiness.token
      });
      break;
    case 'Redeem':
      fromBusiness = db.data.businesses.find(b => b.owner === event.business);
      graph.setEdge(event.user, fromBusiness.owner, {
        type: event.type.toLowerCase(),
        amount: event.amount,
        token: fromBusiness.token
      });
      break;
    case 'transfer':
      fromBusiness = db.data.businesses.find(b => b.owner === event.business);
      graph.setEdge(event.from, event.to, {
        type: event.type.toLowerCase(),
        amount: event.amount,
        token: fromBusiness.token
      });
      break;
    case 'swap':
      fromBusiness = db.data.businesses.find(b => b.owner === event.fromBusiness);
      toBusiness = db.data.businesses.find(b => b.owner === event.toBusiness);
      graph.setEdge(event.fromUser, event.toUser, {
        type: event.type.toLowerCase(),
        amount: event.fromAmount,
        token: fromBusiness.token
      });
      graph.setEdge(event.toUser, event.fromUser, {
        type: event.type.toLowerCase(),
        amount: event.toAmount,
        token: toBusiness.token
      });
      break;
    default:
      continue;
  }
}

console.log('Graph is ready');

const edges = graph.edges();

console.log('----------------- Token flow: -------------------------');
// edges.forEach(e => {
//     let weight = graph.edge(e);
//     console.log(`${e.v} --(${weight.type} :${weight.amount} ${weight.token})--> ${e.w}`);
// });


// choose the business to analyze
const business = db.data.businesses[0];
if (!business) {
  console.error(`Business ${businessBrand} not found`);
  process.exit(1);
}

const businessAddress = business.owner;

console.log(`------------ Token flow in ${business.brand} [${business.owner}]`);
edges.forEach(e => {
  const edgeData = graph.edge(e);
  const involved = (e.v === businessAddress || e.w === businessAddress);

  if (involved) {
    const direction = e.v === businessAddress
      ? `[${e.v}] -> ${e.w}`
      : `${e.v} -> [${e.w}]`;
    console.log(`[${edgeData.type}] ${direction} (${edgeData.amount} ${edgeData.token})`);
  }
});

console.log('-------------------- Finding all paths from reward to redeem in specific business ---------------');

// since reward -> redeem routes don't contain transfer & swap, 
// ignore "transfer", "swap" case when setting edges
export function findAllPaths(graph, start, end, maxDepth = 2) {
  const paths = [];

  function dfs(currentNode, visited, path) {
    if (path.length > maxDepth) return;
    path.push(currentNode);
    visited.add(currentNode);

    // Allow cycles (start === end), but skip trivial path
    const isValidEnd = currentNode === end && path.length > 1;

    if (isValidEnd) {
      paths.push([...path]);
    }

    const neighbors = graph.successors(currentNode) || [];
    for (const neighbor of neighbors) {
      // Allow revisiting the `end` node to form a loop, but prevent revisiting intermediate nodes
      if (!visited.has(neighbor) || neighbor === end) {
        dfs(neighbor, visited, path);
      }
    }

    path.pop();
    visited.delete(currentNode);
  }

  dfs(start, new Set(), []);
  return paths;
}

const source = business.owner;
const target = business.owner;

const paths = findAllPaths(graph, source, target, 2); // max depth = 5

if (paths.length === 0) {
  console.log(`No token flow paths found from ${source} to ${target}`);
  process.exit(0);
}

console.log('path count: ', paths.length);

paths.forEach((path, i) => {
  const pathString = path.join(' -> ')
  console.log(`Path ${i + 1}: ${pathString}`);
});