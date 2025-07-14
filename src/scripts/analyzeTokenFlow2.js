
import { argv }         from 'node:process';
import { graph }        from './commonGraph.js';
import console          from 'node:console';

const idx  = argv.indexOf('--top');
const topN = idx > -1 ? Number(argv[idx + 1]) || 10 : 10;

const rewardIn   = Object.create(null);   
const redeemOut  = Object.create(null);   
const transferCt = Object.create(null);   

for (const e of graph.edges()) {
  const attr = graph.edge(e);

  switch (attr.type) {
    case 'reward':
      rewardIn[e.w]  = (rewardIn[e.w]  || 0) + (attr.amount || 0);
      break;
    case 'redeem':
      redeemOut[e.v] = (redeemOut[e.v] || 0) + (attr.amount || 0);
      break;
    case 'transfer':
      transferCt[e.v] = (transferCt[e.v] || 0) + 1;
      break;
    default:
  }
}

const rank = obj => Object.entries(obj)
                          .sort(([,a],[,b]) => b - a)
                          .slice(0, topN)
                          .map(([address,value]) => ({ address, value }));

console.log(`\n========== MOST-ACTIVE USERS (top ${topN}) ==========\n`);

console.log('► Reward receivers (total tokens in)');
console.table(rank(rewardIn));

console.log('\n► Redeemers (total tokens out)');
console.table(rank(redeemOut));

console.log('\n► Transfer senders (# of transfer txs)');
console.table(rank(transferCt));