// This script first builds the complete user analytics ledger and
// then uses that data to find the specific business rule anomaly
// requested by the manager: users who redeemed more tokens than
// they were directly rewarded.

import { graph, businesses } from './commonGraph.js';


const userAnalytics = {};

function ensureUserTokenAnalytics(user, token) {
  if (!userAnalytics[user]) {
    userAnalytics[user] = {};
  }
  if (!userAnalytics[user][token]) {
    userAnalytics[user][token] = {
      rewarded: 0,
      redeemed: 0,
      transferredIn: 0,
      transferredOut: 0,
      swappedIn: 0,
      swappedOut: 0,
    };
  }
}

graph.edges().forEach(e => {
  const { v: from, w: to } = e;
  const { type, token, amount } = graph.edge(e);

  ensureUserTokenAnalytics(from, token);
  ensureUserTokenAnalytics(to, token);

  switch (type) {
    case 'reward':
      userAnalytics[to][token].rewarded += amount;
      break;
    case 'redeem':
      userAnalytics[from][token].redeemed += amount;
      break;
    case 'transfer':
      userAnalytics[from][token].transferredOut += amount;
      userAnalytics[to][token].transferredIn += amount;
      break;
    case 'swap':
      userAnalytics[from][token].swappedOut += amount;
      userAnalytics[to][token].swappedIn += amount;
      break;
  }
});


console.log('\n\n======================================================');
console.log('== Task 5: Anomaly Detection Report                 ==');
console.log('======================================================');

console.log("\n► Business Rule Anomaly: Users Redeeming More Than Their Direct Rewards");
console.log("  (The primary anomaly defined as 'no reward for a specific user, but many redeems')");

let anomaliesFound = 0;

for (const userAddress in userAnalytics) {
  const userTokenData = userAnalytics[userAddress];

  for (const tokenAddress in userTokenData) {
    const tokenData = userTokenData[tokenAddress];

    if (tokenData.redeemed > tokenData.rewarded) {
      anomaliesFound++;
      
      const businessInfo = businesses.find(b => b.token === tokenAddress);
      const brandName = businessInfo ? businessInfo.brand : 'Unknown Business';
      const difference = tokenData.redeemed - tokenData.rewarded;

      console.log(`\n  - Anomaly Found for Business: "${brandName}"`);
      console.log(`    - User: ${userAddress}`);
      console.log(`    - Token: ${tokenAddress}`);
      console.log(`      > Rewarded: ${tokenData.rewarded} | Redeemed: ${tokenData.redeemed}`);
      console.log(`      > Insight: This user redeemed ${difference} more tokens than they were directly rewarded, indicating they acquired them from the open market.`);
    }
  }
}

if (anomaliesFound === 0) {
    console.log("\n  No users found who redeemed more than they were rewarded. All activity is normal according to this rule.");
}

console.log("\n\n--- End of Report ---");