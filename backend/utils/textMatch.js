const { deburr } = require('lodash');

// very light fuzzy picking by normalized string containment
function norm(s){ return deburr(String(s).toLowerCase().trim()); }

function pickBestStop(query, stopsById){
  const q = norm(query);
  let best = null, bestScore = -1;
  for (const stop of Object.values(stopsById)) {
    const cand = norm(`${stop.stop_name} ${stop.line_names?.join(' ') || ''}`);
    let score = 0;
    if (cand === q) score = 100;
    else if (cand.includes(q)) score = Math.min(99, q.length);
    if (score > bestScore) { best = stop; bestScore = score; }
  }
  return best;
}

module.exports = { pickBestStop };
