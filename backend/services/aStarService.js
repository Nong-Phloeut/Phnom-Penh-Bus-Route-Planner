// aStarService.js
// AI Route Planning for Smart Bus Transport in Phnom Penh
// ------------------------------------------------------
// This file implements the A* Search Algorithm for finding
// the best bus route between two stops in the city.
// ------------------------------------------------------

const { COST_WEIGHTS, TRANSFER_PENALTY_MIN, WAIT_TIME_MIN } = require('../config/constants');

/**
 * Minimal Priority Queue (Min Heap)
 * Used to always expand the lowest-cost node first (AI search frontier).
 */
class MinPQ {
  constructor(){ this.a=[]; }
  push(item, p){ this.a.push({item,p}); this._up(this.a.length-1); }
  pop(){
    if (!this.a.length) return null;
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) { this.a[0]=last; this._down(0); }
    return top.item;
  }
  _up(i){ while(i){ const p=(i-1)>>1; if (this.a[p].p<=this.a[i].p) break; [this.a[p],this.a[i]]=[this.a[i],this.a[p]]; i=p; } }
  _down(i){
    const n=this.a.length;
    while(true){
      let l=i*2+1, r=l+1, s=i;
      if (l<n && this.a[l].p<this.a[s].p) s=l;
      if (r<n && this.a[r].p<this.a[s].p) s=r;
      if (s===i) break; [this.a[s],this.a[i]]=[this.a[i],this.a[s]]; i=s;
    }
  }
}

/**
 * Heuristic Function (AI component):
 * Estimates time from one stop to another.
 * Here we use a simplified "straight line" approximation.
 */
function heuristicTimeMin(aStop, bStop) {
  if (!aStop || !bStop) return 0;
  const dx = Math.hypot(aStop.lat - bStop.lat, aStop.lon - bStop.lon);
  return dx * 100; // heuristic weight
}

/**
 * A* Search Algorithm
 * -------------------
 * - Expands paths with the lowest f(n) = g(n) + h(n)
 *   where g(n) = actual cost so far
 *         h(n) = estimated cost (heuristic)
 */
function aStar({ startStopId, goalStopId, graph, stopsById, linesById, optimizeFor='balanced' }) {
  const weights = COST_WEIGHTS[optimizeFor] || COST_WEIGHTS.balanced;
  const goalStop = stopsById[goalStopId];

  // Priority queue (open set of states to explore)
  const open = new MinPQ();
  const g = new Map();     // Cost so far
  const came = new Map();  // Parent links for path reconstruction

  // Start state: each outgoing line from start stop
  for (const e of (graph[startStopId] || [])) {
    const s = `${startStopId}|${e.line_id}`;
    g.set(s, 0);
    open.push(s, 0);
  }

  // Main A* loop
  while (true) {
    const cur = open.pop();
    if (!cur) throw new Error('No route found');

    const [curStopId, curLineId] = cur.split('|');

    // Goal test: reached target stop
    if (curStopId === String(goalStopId)) {
      const path = [];
      let x = cur;
      while (x) { path.unshift(x); x = came.get(x); }
      return finalizePath(path, { stopsById, graph, linesById });
    }

    const neighbors = graph[curStopId] || [];

    // 1. Continue on the same line
    for (const e of neighbors.filter(e => e.line_id === curLineId)) {
      const nxt = `${e.to}|${curLineId}`;
      const stepCost = weights.time*e.time_min + weights.distance*e.distance_km;
      const tentative = (g.get(cur) ?? Infinity) + stepCost;

      if (tentative < (g.get(nxt) ?? Infinity)) {
        g.set(nxt, tentative);
        came.set(nxt, cur);
        const h = weights.time * heuristicTimeMin(stopsById[e.to], goalStop);
        open.push(nxt, tentative + h);
      }
    }

    // 2. Transfer to another line (penalty cost)
    for (const newLine of [...new Set(neighbors.map(e => e.line_id))].filter(l => l !== curLineId)) {
      const nxt = `${curStopId}|${newLine}`;
      const transferPenalty = weights.time*(TRANSFER_PENALTY_MIN + WAIT_TIME_MIN) + weights.transfer*1;
      const tentative = (g.get(cur) ?? Infinity) + transferPenalty;

      if (tentative < (g.get(nxt) ?? Infinity)) {
        g.set(nxt, tentative);
        came.set(nxt, cur);
        const h = weights.time * heuristicTimeMin(stopsById[curStopId], goalStop);
        open.push(nxt, tentative + h);
      }
    }
  }
}

/**
 * Reconstructs the route from the state path
 * and builds human-readable instructions.
 */
function finalizePath(statePath, { stopsById, graph, linesById }) {
  const nodes = statePath.map(k => {
    const [sid, lid] = k.split('|');
    return { stop: stopsById[sid], line_id: lid };
  });

  const steps = [];
  let i = 0;

  while (i < nodes.length - 1) {
    const cur = nodes[i];
    const line_id = cur.line_id;
    const segStops = [cur.stop];
    let distance = 0, time = 0;
    let j = i + 1;

    while (j < nodes.length && nodes[j].line_id === line_id) {
      const a = nodes[j - 1].stop.stop_id;
      const b = nodes[j].stop.stop_id;
      if (a !== b) {
        const edge = (graph[a] || []).find(e => e.to === b && e.line_id === line_id);
        if (edge) { 
          distance += edge.distance_km; 
          time += edge.time_min; 
        }
        segStops.push(nodes[j].stop);
      }
      j++;
    }

    // Build instruction
    let instruction;
    if (steps.length === 0) {
      instruction = `Take ${linesById[line_id]?.name || line_id} from ${segStops[0].stop_name} to ${segStops[segStops.length - 1].stop_name}`;
    } else {
      instruction = `Transfer to ${linesById[line_id]?.name || line_id} at ${segStops[0].stop_name}, then continue to ${segStops[segStops.length - 1].stop_name}`;
    }

    steps.push({
      line_id,
      line_name: linesById[line_id]?.name || line_id,
      from: segStops[0].stop_name,
      to: segStops[segStops.length - 1].stop_name,
      stop_ids: segStops.map(s => s.stop_id),
      distance_km: Number(distance.toFixed(3)),
      eta_min: Math.round(time),
      instruction
    });

    i = j;
  }

  // Summaries
  let transfers = steps.length - 1;
  const totalDist = steps.reduce((s,x)=>s+x.distance_km,0);
  const totalTime = steps.reduce((s,x)=>s+x.eta_min,0);
  const totalStops = steps.reduce((s,x)=>s+(x.stop_ids.length-1),0);

  return {
    steps,
    summary: { transfers, distance_km: totalDist, eta_min: totalTime, stops: totalStops }
  };
}

module.exports = { aStar };
