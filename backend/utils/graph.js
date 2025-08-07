// utils/graph.js
function buildGraph(routes) {
  const graph = {};

  routes.forEach(({ line, stops }) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];

      if (!graph[from]) graph[from] = [];
      if (!graph[to]) graph[to] = [];

      // Assume fixed travel time and cost per segment
      const travelTime = 5; // minutes
      const cost = 1000;    // Cambodian Riel

      graph[from].push({ stop: to, line, time: travelTime, cost });
      graph[to].push({ stop: from, line, time: travelTime, cost }); // bidirectional
    }
  });

  return graph;
}

function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const queue = [];

  for (const node in graph) {
    distances[node] = Infinity;
  }
  distances[start] = 0;

  queue.push({ stop: start, dist: 0, path: [{ stop: start, line: null }] });

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const current = queue.shift();
    const currentStop = current.stop;

    if (visited.has(currentStop)) continue;
    visited.add(currentStop);

    if (currentStop === end) {
      return current.path; // full path with stops and lines
    }

    for (const neighbor of graph[currentStop]) {
      const { stop: nextStop, line, time, cost } = neighbor;
      if (visited.has(nextStop)) continue;

      const altDist = distances[currentStop] + time;

      if (altDist < distances[nextStop]) {
        distances[nextStop] = altDist;

        const newPath = [...current.path];
        newPath.push({ stop: nextStop, line });

        queue.push({ stop: nextStop, dist: altDist, path: newPath });
        previous[nextStop] = currentStop;
      }
    }
  }

  return null; // no path found
}

module.exports = { buildGraph, dijkstra };
