// aStarService
const { COST_WEIGHTS, TRANSFER_PENALTY_MIN, WAIT_TIME_MIN } = require('../config/constants');

// Priority queue (binary heap, minimal)
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

function heuristicTimeMin(aStop, bStop, avgKmph){
  if (!aStop || !bStop) return 0;
  const dx = Math.hypot(aStop.lat - bStop.lat, aStop.lon - bStop.lon);
  return dx * 100;
}

function aStar({ startStopId, goalStopId, graph, stopsById, linesById, optimizeFor='balanced' }) {
  const weights = COST_WEIGHTS[optimizeFor] || COST_WEIGHTS.balanced;

  const startNeighbors = graph[startStopId] || [];
  const goalStop = stopsById[goalStopId];

  if (startNeighbors.length === 0) throw new Error('Start stop has no outgoing edges');

  const startStates = new Set();
  for (const e of startNeighbors) startStates.add(`${startStopId}|${e.line_id}`);

  const open = new MinPQ();
  const g = new Map();
  const came = new Map();

  for (const s of startStates) {
    g.set(s, 0);
    open.push(s, 0);
  }

  while (true) {
    const cur = open.pop();
    if (!cur) throw new Error('No route found');

    const [curStopId, curLineId] = cur.split('|');

    if (curStopId === String(goalStopId)) {
      const path = [];
      let x = cur;
      while (x) { path.unshift(x); x = came.get(x); }
      return finalizePath(path, { stopsById, graph, linesById, weights });
    }

    const neighbors = graph[curStopId] || [];

    // Continue same line
    for (const e of neighbors.filter(e => e.line_id === curLineId)) {
      const nxt = `${e.to}|${curLineId}`;
      const stepCost = weights.time*e.time_min + weights.distance*e.distance_km;
      const tentative = (g.get(cur) ?? Infinity) + stepCost;

      if (tentative < (g.get(nxt) ?? Infinity)) {
        g.set(nxt, tentative);
        came.set(nxt, cur);
        const h = weights.time * heuristicTimeMin(stopsById[e.to], goalStop, 18);
        open.push(nxt, tentative + h);
      }
    }

    // Transfer to other lines
    const otherLines = [...new Set(neighbors.map(e => e.line_id))].filter(l => l !== curLineId);
    for (const newLine of otherLines) {
      const nxt = `${curStopId}|${newLine}`;
      const transferPenalty = weights.time*(TRANSFER_PENALTY_MIN + WAIT_TIME_MIN) + weights.transfer*1;
      const tentative = (g.get(cur) ?? Infinity) + transferPenalty;
      if (tentative < (g.get(nxt) ?? Infinity)) {
        g.set(nxt, tentative);
        came.set(nxt, cur);
        const h = weights.time * heuristicTimeMin(stopsById[curStopId], goalStop, 18);
        open.push(nxt, tentative + h);
      }
    }
  }
}

function finalizePath(statePath, { stopsById, graph, linesById, weights }) {
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

    // Build instruction string
    let instruction;
    if (steps.length === 0) {
      // First step
      instruction = `Take Line ${linesById[line_id]?.name || line_id} from ${segStops[0].stop_name} to ${segStops[segStops.length - 1].stop_name}`;
    } else {
      // Transfer step
      const prevStep = steps[steps.length - 1];
      instruction = `Transfer to Line ${linesById[line_id]?.name || line_id} at ${segStops[0].stop_name}, then continue to ${segStops[segStops.length - 1].stop_name}`;
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

  let transfers = 0, totalDist = 0, totalTime = 0, totalStops = 0;
  for (let k = 0; k < steps.length; k++) {
    totalDist += steps[k].distance_km;
    totalTime += steps[k].eta_min;
    totalStops += (steps[k].stop_ids.length - 1);
    if (k > 0) transfers++;
  }

  return {
    steps,
    summary: { transfers, distance_km: totalDist, eta_min: totalTime, stops: totalStops }
  };
}


module.exports = { aStar };
