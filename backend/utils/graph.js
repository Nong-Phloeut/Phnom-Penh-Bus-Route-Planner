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

function suggestAlternativePaths(graph, from, to, maxSuggestions = 3, maxDepth = 3) {
  // BFS from destination 'to' to find nearby stops within maxDepth
  const queue = [{ stop: to, depth: 0 }];
  const nearbyStops = new Set();
  const visited = new Set([to]);

  while (queue.length > 0 && nearbyStops.size < maxSuggestions) {
    const { stop, depth } = queue.shift();

    if (depth > 0 && stop !== to) {
      nearbyStops.add(stop);
    }

    if (depth < maxDepth) {
      for (const neighbor of graph[stop] || []) {
        if (!visited.has(neighbor.stop)) {
          visited.add(neighbor.stop);
          queue.push({ stop: neighbor.stop, depth: depth + 1 });
        }
      }
    }
  }

  // Try to find paths from 'from' to each nearby stop using dijkstra
  const suggestions = [];
  for (const altStop of nearbyStops) {
    const path = dijkstra(graph, from, altStop);
    if (path) {
      suggestions.push({ path, alternativeDestination: altStop });
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  // If no suggestions from near destination, fallback: try nearby stops to 'from'
  if (suggestions.length === 0) {
    // BFS from 'from'
    const fromQueue = [{ stop: from, depth: 0 }];
    const fromVisited = new Set([from]);
    const fromNearbyStops = new Set();

    while (fromQueue.length > 0 && fromNearbyStops.size < maxSuggestions) {
      const { stop, depth } = fromQueue.shift();

      if (depth > 0 && stop !== from) {
        fromNearbyStops.add(stop);
      }

      if (depth < maxDepth) {
        for (const neighbor of graph[stop] || []) {
          if (!fromVisited.has(neighbor.stop)) {
            fromVisited.add(neighbor.stop);
            fromQueue.push({ stop: neighbor.stop, depth: depth + 1 });
          }
        }
      }
    }

    for (const altStop of fromNearbyStops) {
      const path = dijkstra(graph, from, altStop);
      if (path) {
        suggestions.push({ path, alternativeDestination: altStop });
        if (suggestions.length >= maxSuggestions) break;
      }
    }
  }

  // If still empty, fallback to just return the start node path
  if (suggestions.length === 0) {
    suggestions.push({ path: [{ stop: from, line: null }], alternativeDestination: from });
  }

  return suggestions;
}



module.exports = { buildGraph, dijkstra ,suggestAlternativePaths};
