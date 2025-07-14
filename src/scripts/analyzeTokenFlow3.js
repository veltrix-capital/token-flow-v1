import { argv }          from 'node:process';
import { events, businesses } from './commonGraph.js';
import console           from 'node:console';

const idx  = argv.indexOf('--top');
const TOP  = idx > -1 ? Number(argv[idx + 1]) || 10 : 10;

const byOwner = Object.fromEntries(
  businesses.map(b => [b.owner.toLowerCase(), b])
);


const lastInbound = Object.create(null);

const directCnt   = Object.create(null);     
const indirectCnt = Object.create(null);     
const routerCnt   = Object.create(null);    

for (const ev of events) {
  switch (ev.type) {
    case 'Reward':
      lastInbound[`${ev.user}|${ev.token}`] = {
        kind: 'Reward',
        business: ev.business
      };
      break;

    case 'transfer':
      lastInbound[`${ev.to}|${ev.token}`] = {
        kind: 'Transfer',
        business: ev.business
      };
      break;

    case 'swap':
      lastInbound[`${ev.toUser}|${ev.toToken}`] = {
        kind: 'Swap',
        business: ev.toBusiness
      };
      lastInbound[`${ev.fromUser}|${ev.fromToken}`] = {
        kind: 'Swap',
        business: ev.fromBusiness
      };
      break;

    case 'Redeem': {
      const key     = `${ev.user}|${ev.token}`;
      const prev    = lastInbound[key];
      const isDirect =
        prev && prev.kind === 'Reward' && prev.business === ev.business;

      const bucket  = isDirect ? directCnt : indirectCnt;
      bucket[ev.user] = (bucket[ev.user] || 0) + 1;

      const biz            = byOwner[ev.business.toLowerCase()];
      const redeemRouter   = biz ? biz.redeemRouter : 'unknown';
      routerCnt[redeemRouter] = (routerCnt[redeemRouter] || 0) + 1;
      break;
    }

    default:
  }
}

function rank(obj) {
  return Object.entries(obj)
               .sort(([,a],[,b]) => b - a)
               .slice(0, TOP)
               .map(([address, count]) => ({ address, count }));
}

console.log(`\n========== REDEMPTION BEHAVIOUR (top ${TOP}) ==========\n`);

const totalDirect   = Object.values(directCnt).reduce((s,n)=>s+n,0);
const totalIndirect = Object.values(indirectCnt).reduce((s,n)=>s+n,0);

console.log(`Direct redeems   : ${totalDirect}`);
console.log(`Indirect redeems : ${totalIndirect}`);

console.log('\n► Top Direct Redeemers');
console.table(rank(directCnt));

console.log('\n► Top Indirect Redeemers');
console.table(rank(indirectCnt));

console.log('\n► Redeem Router Usage');
console.table(
  Object.entries(routerCnt)
        .sort(([,a],[,b]) => b - a)
        .map(([router, count]) => ({ router, count }))
);