const routesData = require('../data/routes.json');
const { buildGraph, dijkstra, suggestAlternativePaths } = require('../utils/graph');

const graph = buildGraph(routesData);

function calculateTotalTimeAndCost(path) {
  let totalTime = 0;
  let totalCost = 0;
  let prevLine = path[1]?.line || null;

  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const prev = path[i - 1];

    const edge = graph[prev.stop].find(
      (e) => e.stop === current.stop && e.line === current.line
    );

    totalTime += edge.time;
    totalCost += edge.cost;

    if (current.line !== prevLine && prevLine !== null) {
      totalTime += 10;    // transfer time penalty
      totalCost += 2000;  // transfer cost penalty
    }

    prevLine = current.line;
  }

  return { totalTime, totalCost };
}

function buildSteps(path) {
  let steps = [];
  let prevLine = path[1]?.line || null;
  steps.push(`Take Line ${prevLine} from ${path[0].stop} to`);

  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const prev = path[i - 1];

    if (current.line !== prevLine) {
      steps.push(`Transfer to Line ${current.line} at ${prev.stop}`);
      steps.push(`Then take Line ${current.line} from ${prev.stop} to ${current.stop}`);
      prevLine = current.line;
    } else {
      steps[steps.length - 1] += ` ${current.stop}`;
    }
  }
  return steps;
}

function findBestRoute(from, to) {
  if (from === to) {
    return {
      from,
      to,
      totalTime: 0,
      totalCost: 0,
      transfers: 0,
      steps: [`You are already at ${from}.`],
    };
  }

  if (!graph[from] || !graph[to]) {
    throw { status: 400, message: 'Invalid stop names.' };
  }

  const path = dijkstra(graph, from, to);

  if (!path) {
    const suggestions = suggestAlternativePaths(graph, from, to);

    if (!suggestions || suggestions.length === 0) {
      throw { status: 404, message: 'No route or suggestions available.' };
    }

    const scoredSuggestions = suggestions.map(({ path, alternativeDestination }) => {
      const { totalTime, totalCost } = calculateTotalTimeAndCost(path);
      return {
        alternativeDestination,
        steps: buildSteps(path),
        totalTime,
        totalCost,
        message: `No direct route to ${to}. Suggested route ends at nearby stop: ${alternativeDestination}.`
      };
    });

    scoredSuggestions.sort((a, b) => a.totalTime - b.totalTime);
    return {
      message: 'No direct route available. Try this alternative:',
      suggestion: scoredSuggestions[0],
    };
  }

  const { totalTime, totalCost } = calculateTotalTimeAndCost(path);
  const steps = buildSteps(path);

  return {
    from,
    to,
    totalTime,
    totalCost,
    transfers: steps.filter((step) => step.includes('Transfer')).length,
    steps,
  };
}

module.exports = { findBestRoute };
