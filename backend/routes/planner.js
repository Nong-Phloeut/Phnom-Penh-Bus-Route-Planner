const express = require('express');
const router = express.Router();
const routesData = require('../data/routes.json');
const { buildGraph, dijkstra, suggestAlternativePaths } = require('../utils/graph');

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
    const suggestions = suggestAlternativePaths(graph, from, to);

    if (!suggestions || suggestions.length === 0) {
      return res.status(404).json({ message: 'No route or suggestions available.' });
    }

  // Helper to calculate total time and cost for a path
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

        // Add transfer penalty if line changes
        if (current.line !== prevLine && prevLine !== null) {
          totalTime += 10;    // transfer time penalty
          totalCost += 2000;  // transfer cost penalty
        }

        prevLine = current.line;
      }

      return { totalTime, totalCost };
    }

    // Score all suggestions
    const scoredSuggestions = suggestions.map(({ path, alternativeDestination }) => {
      const { totalTime, totalCost } = calculateTotalTimeAndCost(path);

      // Build steps instructions
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

      return {
        alternativeDestination,
        steps,
        totalTime,
        totalCost,
        message: `No direct route to ${to}. Suggested route ends at nearby stop: ${alternativeDestination}.`
      };
    });

    // Pick best by shortest total time
    scoredSuggestions.sort((a, b) => a.totalTime - b.totalTime);
    const bestSuggestion = scoredSuggestions[0];

    return res.json({
      message: 'No direct route available. Try this alternative:',
      suggestion: bestSuggestion,
    });
  }


  // If path found, proceed as before
  let totalTime = 0;
  let totalCost = 0;
  let steps = [];
  let prevLine = path[1]?.line || null;

  steps.push(`Take Line ${prevLine} from ${path[0].stop} to`);

  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const prev = path[i - 1];

    const edge = graph[prev.stop].find(
      (e) => e.stop === current.stop && e.line === current.line
    );
    totalTime += edge.time;
    totalCost += edge.cost;

    if (current.line !== prevLine) {
      steps.push(`Transfer to Line ${current.line} at ${prev.stop}`);
      steps.push(`Then take Line ${current.line} from ${prev.stop} to ${current.stop}`);
      prevLine = current.line;
    } else {
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
