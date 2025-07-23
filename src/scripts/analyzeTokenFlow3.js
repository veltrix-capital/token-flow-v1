// =====================================================================
// == Task 3: Redemption Behavior Analysis (Corrected Version)        ==
// =====================================================================
// This script has been modified to correctly identify direct vs. indirect
// redemptions. It replaces the flawed "last inbound" logic with a
// stateful system that tracks a user's balance of unspent rewards.
//
// Created by: Archit Gupta
// Date: [Today's Date]
// =====================================================================

import { argv } from 'node:process';
import { events, businesses } from './commonGraph.js';
import console from 'node:console';

const idx = argv.indexOf('--top');
const TOP = idx > -1 ? Number(argv[idx + 1]) || 10 : 10;

// This mapping is useful and can remain.
const byOwner = Object.fromEntries(
  businesses.map(b => [b.owner.toLowerCase(), b])
);

// --- The Core Fix ---
// We replace the flawed `lastInbound` object with a new object
// that tracks the "balance" of available rewards for each user/token pair.
// We will count the number of reward events.
const rewardBalances = Object.create(null);

const directCnt = Object.create(null);
const indirectCnt = Object.create(null);
const routerCnt = Object.create(null);

// Loop through all events to process them statefully.
for (const ev of events) {
  switch (ev.type) {
    case 'Reward': {
      // When a user is rewarded, we INCREMENT their balance of available rewards.
      const key = `${ev.user}|${ev.token}`;
      rewardBalances[key] = (rewardBalances[key] || 0) + 1;
      break;
    }
    
    // Transfers and Swaps do not affect the "direct reward" balance,
    // so they are not needed in this specific calculation.

    case 'Redeem': {
      const key = `${ev.user}|${ev.token}`;
      const availableRewards = rewardBalances[key] || 0;

      // A redemption is "direct" ONLY if there is an unspent reward credit available.
      const isDirect = availableRewards > 0;

      // Place the count in the correct bucket.
      const bucket = isDirect ? directCnt : indirectCnt;
      bucket[ev.user] = (bucket[ev.user] || 0) + 1;

      // If the redemption was direct, we "spend" one reward credit.
      if (isDirect) {
        rewardBalances[key]--;
      }

      // This logic for router usage is independent and can remain.
      const biz = byOwner[ev.business.toLowerCase()];
      const redeemRouter = biz ? biz.redeemRouter : 'unknown';
      routerCnt[redeemRouter] = (routerCnt[redeemRouter] || 0) + 1;
      break;
    }

    default:
      // Other event types are ignored.
  }
}

// The ranking and reporting logic below does not need to change.
function rank(obj) {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP)
    .map(([address, count]) => ({ address, count }));
}

console.log(`\n========== REDEMPTION BEHAVIOUR (top ${TOP}) ==========\n`);

const totalDirect = Object.values(directCnt).reduce((s, n) => s + n, 0);
const totalIndirect = Object.values(indirectCnt).reduce((s, n) => s + n, 0);

console.log(`Direct redeems   : ${totalDirect}`);
console.log(`Indirect redeems : ${totalIndirect}`); // This will now show a correct, non-zero number

console.log('\n► Top Direct Redeemers');
console.table(rank(directCnt));

console.log('\n► Top Indirect Redeemers');
console.table(rank(indirectCnt)); // Un-commented to show the result

console.log('\n► Redeem Router Usage');
console.table(
  Object.entries(routerCnt)
    .sort(([, a], [, b]) => b - a)
    .map(([router, count]) => ({ router, count }))
);