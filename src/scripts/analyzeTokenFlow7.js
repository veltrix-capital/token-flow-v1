import { argv }                      from 'node:process';
import { businesses, events, graph } from './commonGraph.js';

function usage () {
  console.log('Usage: node analyzeTokenFlow7.js (--business 0x.. | --brand "Name") [--top N]');
  process.exit(1);
}

let biz = null;

const bIdx = argv.indexOf('--business');
if (bIdx > -1) {
  const addr = argv[bIdx + 1]?.toLowerCase();
  biz = businesses.find(b => b.owner.toLowerCase() === addr);
}

const nIdx = argv.indexOf('--brand');
if (!biz && nIdx > -1) {
  const name = argv[nIdx + 1];
  biz = businesses.find(b => b.brand.toLowerCase() === name.toLowerCase());
}

if (!biz) usage();

const TOP = (() => {
  const i = argv.indexOf('--top');
  return i > -1 ? Number(argv[i + 1]) || 10 : 10;
})();

let rewardOut  = 0;     
let redeemIn   = 0;     
let swapOut    = 0;     
events.forEach(e => {
  if (e.type === 'Reward' && e.business === biz.owner)      rewardOut += e.amount;
  else if (e.type === 'Redeem' && e.business === biz.owner) redeemIn  += e.amount;
  else if (e.type === 'swap' && e.fromBusiness === biz.owner) swapOut += e.fromAmount;
});

let backFlow = 0;
graph.inEdges(biz.owner).forEach(key => {
  const attr = graph.edge(key);
  if (attr.token === biz.token) backFlow += attr.amount ?? 0;
});

const recipients = Object.create(null);   
const redeemers  = Object.create(null);

events.forEach(e => {
  if (e.type === 'Reward' && e.business === biz.owner) {
    recipients[e.user] = (recipients[e.user] || 0) + e.amount;
  }
  if (e.type === 'Redeem' && e.business === biz.owner) {
    redeemers[e.user]  = (redeemers[e.user]  || 0) + e.amount;
  }
});

function top(obj) {
  return Object.entries(obj)
               .sort(([,a],[,b]) => b - a)
               .slice(0, TOP)
               .map(([a,v]) => ({ address: a, amount: v }));
}

const pct = (num, denom) => denom ? (num / denom * 100).toFixed(2) + ' %' : '0 %';

console.log(`\n========== BUSINESS ANALYTICS  –  ${biz.brand} ==========\n`);
console.log(`Owner address         : ${biz.owner}`);
console.log(`Token address         : ${biz.token}\n`);

console.log(`Tokens issued  (Reward) : ${rewardOut}`);
console.log(`Redeemed back           : ${redeemIn}   (${pct(redeemIn, rewardOut)})`);
console.log(`Swapped out             : ${swapOut}    (${pct(swapOut, rewardOut)})`);
console.log(`Total back-flow to owner: ${backFlow}\n`);

console.log(`► Top ${TOP} Reward recipients`);
console.table(top(recipients));

console.log(`\n► Top ${TOP} Redeemers`);
console.table(top(redeemers));