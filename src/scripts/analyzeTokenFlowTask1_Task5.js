
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
  const edgeData = graph.edge(e);
  const { type, token, amount } = edgeData;

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

console.log('\n======================================================');
console.log('== Final Business-Centric Ecosystem Analytics ==');
console.log('======================================================');

for (const biz of businesses) {
  const businessToken = biz.token;
  console.log(`\n\n--- Report for: ${biz.brand} (Token: ${businessToken}) ---`);

  let hasActivity = false; 

  for (const user in userAnalytics) {
    const userData = userAnalytics[user];

    if (userData[businessToken] && Object.values(userData[businessToken]).some(v => v > 0)) {
        hasActivity = true;
        const tokenData = userData[businessToken];

        console.log(`\n  -> User: ${user}`);
        console.log(`     Activity Summary for '${businessToken}':`);
        console.log(`       - Rewarded: ${tokenData.rewarded} | Redeemed: ${tokenData.redeemed}`);
        console.log(`       - Transferred In: ${tokenData.transferredIn} | Transferred Out: ${tokenData.transferredOut}`);
        console.log(`       - Swapped In: ${tokenData.swappedIn} | Swapped Out: ${tokenData.swappedOut}`);

        const totalIn = tokenData.rewarded + tokenData.transferredIn + tokenData.swappedIn;
        const totalOut = tokenData.redeemed + tokenData.transferredOut + tokenData.swappedOut;
        const trueBalance = totalIn - totalOut;

        console.log(`     ----------------------------------------------------`);
        console.log(`     Current On-Hand Balance of our Token: ${trueBalance}`);
        console.log(`     ----------------------------------------------------`);
        
        if (tokenData.swappedIn > 0 || tokenData.swappedOut > 0) {
          console.log(`     >> Behavior Insight: Market Participant. This user actively SWAPS our token, treating it as a liquid asset.`);
        } else if (tokenData.transferredIn > 0 || tokenData.transferredOut > 0) {
          console.log(`     >> Behavior Insight: Ecosystem Participant. This user transfers our token peer-to-peer, increasing its circulation.`);
        } else {
          console.log(`     >> Behavior Insight: Direct Customer. This user's activity is confined to our business (rewards/redemptions).`);
        }

        if (trueBalance > 0) {
            console.log(`     >> Status Insight: This user is currently a HOLDER with ${trueBalance} of our tokens.`);
        } else if (trueBalance === 0) {
            console.log(`     >> Status Insight: This user currently holds NONE of our tokens.`);
        } else if (trueBalance < 0) {
            console.log(`     >> CRITICAL ANOMALY: User has a negative balance of ${trueBalance}. This suggests their activity started before the current data window.`);
        }
    }
  }

  if (!hasActivity) {
    console.log('\n  No user activity recorded for this token in the current dataset.');
  }
}

console.log("\n\n--- End of Report ---");