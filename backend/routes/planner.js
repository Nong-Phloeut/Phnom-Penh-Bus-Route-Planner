// routes/navigation.js
const express = require('express');
const router = express.Router();
const routesData = require('../data/routes.json');
const { buildGraph, dijkstra } = require('../utils/graph');

const graph = buildGraph(routesData);

router.post('/', (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: 'Please provide both from and to stops.' });
  }

  if (from === to) {
    return res.json({
      from,
      to,
      totalTime: 0,
      totalCost: 0,
      transfers: 0,
      steps: [`You are already at ${from}.`],
    });
  }

  if (!graph[from] || !graph[to]) {
    return res.status(400).json({ message: 'Invalid stop names.' });
  }

  const path = dijkstra(graph, from, to);

  if (!path) {
    return res.status(404).json({ message: 'No route found.' });
  }

  // Calculate total time, cost, and generate instructions
  let totalTime = 0;
  let totalCost = 0;
  let steps = [];
  let prevLine = path[1]?.line || null;

  steps.push(`Take Line ${prevLine} from ${path[0].stop} to`);

  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const prev = path[i - 1];

    // Add segment travel time and cost from graph edges
    const edge = graph[prev.stop].find(
      (e) => e.stop === current.stop && e.line === current.line
    );
    totalTime += edge.time;
    totalCost += edge.cost;

    // Handle line changes (transfers)
    if (current.line !== prevLine) {
      steps.push(`Transfer to Line ${current.line} at ${prev.stop}`);
      steps.push(`Then take Line ${current.line} from ${prev.stop} to ${current.stop}`);
      prevLine = current.line;
    } else {
      // Continue on same line
      steps[steps.length - 1] += ` ${current.stop}`;
    }
  }

  res.json({
    from,
    to,
    totalTime,
    totalCost,
    transfers: steps.filter((step) => step.includes('Transfer')).length,
    steps,
  });
});

module.exports = router;
