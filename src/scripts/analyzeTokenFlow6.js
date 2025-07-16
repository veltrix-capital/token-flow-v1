
import { argv }                  from 'node:process';
import { events, businesses, graph } from './commonGraph.js';

const TOP = (() => {
  const i = argv.indexOf('--top');
  return i > -1 ? Number(argv[i + 1]) || 10 : 10;
})();


const routerStats = {};   // addr → {in, out}

businesses.forEach(b => routerStats[b.redeemRouter] = { in: 0, out: 0 });

events.forEach(ev => {
  switch (ev.type) {
    case 'Redeem': {
      const rtr = businesses.find(b => b.owner === ev.business)?.redeemRouter;
      if (rtr) routerStats[rtr].in += ev.amount;
      if (rtr) routerStats[rtr].out += ev.amount * 0; // physical burn: zero outflow
      break;
    }
    case 'Reward': {
      const rtr = businesses.find(b => b.owner === ev.business)?.rewardRouter;
      if (rtr) {
        routerStats[rtr] ??= { in: 0, out: 0 };
        routerStats[rtr].out += ev.amount;
      }
      break;
    }
    default:
      break;
  }
});

const routerTable = Object.entries(routerStats).map(([addr, io]) => ({
  router: addr,
  inbound: io.in,
  outbound: io.out,
  ratio: io.in ? io.out / io.in : 0
})).sort((a, b) => a.ratio - b.ratio).slice(0, TOP);
       
const tokenTransfers = Object.create(null);
events.forEach(e => {
  if (e.type === 'transfer') tokenTransfers[e.token] = 1;
});
const stagnant = businesses
  .filter(b => !tokenTransfers[b.token])
  .map(b => ({ token: b.token, brand: b.brand }));

                               
const inDeg = Object.create(null);
const outDeg = Object.create(null);

graph.edges().forEach(e => {
  inDeg [e.w] = (inDeg [e.w] || 0) + 1;
  outDeg[e.v] = (outDeg[e.v] || 0) + 1;
});

const holders = Object.keys(inDeg)
  .filter(a => inDeg[a] > 0 && !outDeg[a])
  .slice(0, TOP)
  .map(a => ({ address: a, incomingEdges: inDeg[a] }));

console.log(`\n========== FLOW BOTTLENECKS (top ${TOP}) ==========\n`);

console.log('► Redemption routers with lowest OUT / IN ratio');
console.table(routerTable.length ? routerTable
                                 : [{ router: 'None 🎉', inbound: '', outbound: '', ratio: '' }]);

console.log('\n► Business tokens that never circulate');
console.table(stagnant.length ? stagnant : [{ token: 'None 🎉', brand: '' }]);

console.log('\n► Users who break the flow (receive but never send)');
console.table(holders.length ? holders : [{ address: 'None 🎉', incomingEdges: '' }]);