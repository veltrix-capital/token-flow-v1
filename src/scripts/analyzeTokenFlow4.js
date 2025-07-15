/**
 * Task-4  – Influence / Centrality Analysis
 *
 *   node src/scripts/analyzeTokenFlow_4.js          # top-10
 *   node src/scripts/analyzeTokenFlow_4.js --top 5  # top-5
 */

import { argv }  from 'node:process';
import { graph } from './commonGraph.js';
import console   from 'node:console';

/* ---------- CLI flag ------------------------------------------ */
const idx = argv.indexOf('--top');
const TOP = idx > -1 ? Number(argv[idx + 1]) || 10 : 10;

/* ---------- degree tallies ------------------------------------ */
const nodes   = graph.nodes();
const inDeg   = Object.fromEntries(nodes.map(n => [n, 0]));
const outDeg  = Object.fromEntries(nodes.map(n => [n, 0]));

for (const e of graph.edges()) {
  inDeg [e.w] += 1;
  outDeg[e.v] += 1;
}

/* ---------- lightweight PageRank ------------------------------ */
function pageRank(g, opts = {}) {
  const damping = opts.damping ?? 0.85;
  const maxIter = opts.maxIter ?? 25;

  const N   = g.nodes().length;
  const pr  = Object.fromEntries(g.nodes().map(n => [n, 1 / N]));

  for (let k = 0; k < maxIter; k++) {
    const next = Object.fromEntries(g.nodes().map(n => [n, (1 - damping) / N]));

    g.edges().forEach(e => {
      const attrs   = g.edge(e);
      const weight  = attrs.amount ?? 1;
      const srcOut  = outDeg[e.v] || 1;          // avoid div-by-zero
      next[e.w] += damping * pr[e.v] * weight / srcOut;
    });

    /* normalise so sum(pr) == 1 */
    const norm = Object.values(next).reduce((s, v) => s + v, 0);
    Object.keys(next).forEach(k => (next[k] = next[k] / norm));

    Object.assign(pr, next);
  }
  return pr;
}

const prScores = pageRank(graph);

/* ---------- ranking helper ------------------------------------ */
function top(obj) {
  return Object.entries(obj)
               .sort(([,a],[,b]) => b - a)
               .slice(0, TOP)
               .map(([address, score]) => ({ address, score }));
}

/* ---------- output -------------------------------------------- */
console.log(`\n========== INFLUENCE / CENTRALITY (top ${TOP}) ==========\n`);

console.log('► PageRank (token-weighted)');
console.table(top(prScores));

console.log('\n► In-Degree Centrality  (# incoming edges)');
console.table(top(inDeg));

console.log('\n► Out-Degree Centrality (# outgoing edges)');
console.table(top(outDeg));