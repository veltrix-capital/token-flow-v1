import { argv }                    from 'node:process';
import { graph, events }           from './commonGraph.js';

function cliFlag(name, dflt) {
  const i = argv.indexOf(name);
  return i > -1 ? Number(argv[i + 1]) || dflt : dflt;
}
const TOP       = cliFlag('--top',       10);
const MAX_PATHS = cliFlag('--maxPaths',  10_000);
const MAX_DEPTH = cliFlag('--maxDepth',  7);

const smallCycles = [];
function dfsCycle(start, node, depth, visited) {
  if (depth > 4 || smallCycles.length >= MAX_PATHS) return;
  for (const nxt of graph.successors(node) || []) {
    if (nxt === start && depth >= 2) {
      smallCycles.push([...visited, nxt]);
      if (smallCycles.length >= MAX_PATHS) return;
    } else if (!visited.includes(nxt)) {
      dfsCycle(start, nxt, depth + 1, [...visited, nxt]);
    }
  }
}

for (const n of graph.nodes()) {
  dfsCycle(n, n, 0, [n]);
  if (smallCycles.length >= MAX_PATHS) break;
}

const laundering = [];
function walk(token, origin, node, depth, path, seen) {
  if (depth > MAX_DEPTH || laundering.length >= MAX_PATHS) return;
  for (const succ of graph.successors(node) || []) {
    const attr = graph.edge(node, succ);
    if (attr.token !== token) continue;

    if (succ === origin && depth >= 4) {
      laundering.push({ token, length: depth, path: [...path, succ] });
      if (laundering.length >= MAX_PATHS) return;
    } else {
      const key = `${succ}|${token}|${depth}`;
      if (!seen.has(key)) {
        seen.add(key);
        walk(token, origin, succ, depth + 1, [...path, succ], seen);
      }
    }
  }
}

events
  .filter(e => e.type === 'Reward')
  .forEach(ev => {
    walk(ev.token, ev.user, ev.user, 0, [ev.user], new Set());
    if (laundering.length >= MAX_PATHS) return;
  });

const rewarded = Object.create(null);
const redeemed = Object.create(null);
events.forEach(e => {
  if (e.type === 'Reward')
    rewarded[e.token] = (rewarded[e.token] || 0) + e.amount;
  else if (e.type === 'Redeem')
    redeemed[e.token]  = (redeemed[e.token]  || 0) + e.amount;
});
const orphaned = Object.entries(rewarded)
  .filter(([t]) => (redeemed[t] || 0) === 0)
  .map(([token, amount]) => ({ token, amount }));

const show = arr => arr.slice(0, TOP);

console.log(`\n==== ANOMALY REPORT  (show first ${TOP}, capped at ${MAX_PATHS} paths) ====\n`);

console.log('► Small cycles (length 2-4)');
show(smallCycles).forEach((p,i)=>console.log(`  ${i+1}. ${p.join(' → ')}`));
if (smallCycles.length > TOP) console.log(`  … ${smallCycles.length-TOP} more (capped)`);

console.log('\n► Possible laundering (Reward → ≥4 hops → Redeem)');
show(laundering).forEach((l,i)=>console.log(`  ${i+1}. len=${l.length} token=${l.token}  path=${l.path.join(' → ')}`));
if (laundering.length > TOP) console.log(`  … ${laundering.length-TOP} more (capped)`);

console.log('\n► Orphaned tokens (rewarded but never redeemed)');
console.table(orphaned.length ? orphaned : [{ token: 'None 🎉', amount: '' }]);