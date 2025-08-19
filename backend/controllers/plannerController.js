const { buildGraph } = require('../services/graphBuilder');
const { aStar } = require('../services/aStarService');
const { pickBestStop } = require('../utils/textMatch');
const { FARE_RIEL } = require('../config/constants');

let cached = null;  // naive in-memory cache for the graph

exports.planRoute = async (req, res) => {
  try {
    const { from, to, opt = 'balanced' } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'Query params required: from, to' });
    }

    // Build (or reuse) the graph from CKAN
    if (!cached) {
      cached = await buildGraph();
      console.log("Graph built:", Object.keys(cached.graph).length, "stops loaded:", Object.keys(cached.stopsById).length);
    }

    // Resolve textual stop names to stop IDs using fuzzy pick
    const src = pickBestStop(from, cached.stopsById);
    const dst = pickBestStop(to, cached.stopsById);
    console.log("Pick stops -> from:", from, "=>", src?.stop_name, ", to:", to, "=>", dst?.stop_name);

    if (!src || !dst) {
      return res.status(404).json({ message: 'Could not resolve from/to stop', fromResolved: src?.stop_name, toResolved: dst?.stop_name });
    }

    // Check neighbors for debugging
    const neighbors = cached.graph[src.stop_id] || [];
    if (neighbors.length === 0) {
      console.warn("No outgoing edges from start stop:", src.stop_name);
      return res.status(404).json({ message: 'Start stop has no outgoing edges', stop: src.stop_name });
    }

    // Run A* (transfer-aware)
    let result;
    try {
      result = aStar({
        startStopId: src.stop_id,
        goalStopId: dst.stop_id,
        graph: cached.graph,
        stopsById: cached.stopsById,
        linesById: cached.linesById,
        optimizeFor: opt, // 'fast' | 'few_transfers' | 'balanced'
      });
    } catch (e) {
      console.error("A* failed:", e.message);
      return res.status(404).json({ message: 'No route found between selected stops', error: e.message });
    }

    // Fare model
    const totalBoardings = result.summary.transfers + 1;
    const fare = totalBoardings * FARE_RIEL;

    res.json({
      query: { from, to, resolvedFrom: src.stop_name, resolvedTo: dst.stop_name, optimizeFor: opt },
      summary: {
        stops: result.summary.stops,
        distance_km: Number(result.summary.distance_km.toFixed(2)),
        eta_min: Math.round(result.summary.eta_min),
        transfers: result.summary.transfers,
        boardings: totalBoardings,
        fare_riel: fare
      },
      steps: result.steps
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ message: 'Route planning failed', error: err.message });
  }
};
