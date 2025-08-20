const { deburr } = require('lodash');

// helper function: normalize text
// - deburr: removes accents/diacritics (e.g., "é" → "e")
// - toLowerCase: case-insensitive
// - trim: removes spaces at start/end
function norm(s){ 
  return deburr(String(s).toLowerCase().trim()); 
}

/**
 * pickBestStop: tries to find the best matching stop for a given query
 * 
 * @param {string} query - user input (e.g., "central market")
 * @param {Object} stopsById - dictionary of stops, keyed by stop_id
 * @returns {Object|null} - the best matching stop object or null if none
 */
function pickBestStop(query, stopsById){
  const q = norm(query);   // normalize the query
  let best = null;         // best stop found so far
  let bestScore = -1;      // score of the best stop (-1 means none yet)

  // loop through all stops
  for (const stop of Object.values(stopsById)) {
    // create candidate string: stop name + optional line names
    const cand = norm(`${stop.stop_name} ${stop.line_names?.join(' ') || ''}`);
    
    let score = 0;
    // perfect match → score 100
    if (cand === q) score = 100;
    // partial match → score based on query length (longer match = better)
    else if (cand.includes(q)) score = Math.min(99, q.length);

    // update best match if this stop has higher score
    if (score > bestScore) { 
      best = stop; 
      bestScore = score; 
    }
  }

  // return the best candidate found (or null if none)
  return best;
}

module.exports = { pickBestStop };
