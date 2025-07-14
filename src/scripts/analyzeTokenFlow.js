import { graph, businesses } from './commonGraph.js';

console.log('\n========== WHO RECEIVED FROM WHOM ==========');
graph.edges().forEach(e => {
  const { v: from, w: to } = e;           
  const { type, amount, token } = graph.edge(e);
  console.log(`${from} --(${type}:${amount}:${token})--> ${to}`);
});


function findPaths(src, dst, maxDepth = 6) {
  const paths = [];

  function dfs(node, path) {
    if (path.length > maxDepth) return;

    if (node === dst && path.length > 1) paths.push([...path]);

    const neighbours = graph.successors(node) || [];
    for (const nxt of neighbours) {
      if (!path.includes(nxt) || nxt === dst)
        dfs(nxt, [...path, nxt]);
    }
  }

  dfs(src, [src]);
  return paths;
}

for (const biz of businesses) {
  const loops = findPaths(biz.owner, biz.owner, 6);

  console.log(`\n========== TOKEN-FLOW LOOPS for ${biz.brand} ==========\n`
             + `Owner: ${biz.owner} | Token: ${biz.token}`);

  if (!loops.length) {
    console.log('No Reward→…→Redeem paths found');
    continue;
  }

  loops.forEach((p, i) =>
    console.log(`Path ${i + 1}:  ${p.join(' -> ')}`));
}


const sampleBiz   = businesses[0];
if (sampleBiz) {
  console.log(`\n========== HOP-BY-HOP for token ${sampleBiz.token} ==========`);

  graph.edges().forEach(e => {
    const attr = graph.edge(e);
    if (attr.token === sampleBiz.token) {
      console.log(`${e.v} -> ${e.w} (${attr.type}, ${attr.amount})`);
    }
  });
} else {
  console.log('\nNo businesses in database – cannot show per-token flow.');
}