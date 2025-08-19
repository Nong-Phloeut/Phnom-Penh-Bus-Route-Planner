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
    if (!cached) cached = await buildGraph();

    // Resolve textual stop names to stop IDs using fuzzy pick
    const src = pickBestStop(from, cached.stopsById);
    const dst = pickBestStop(to, cached.stopsById);
    console.log(Object.values(cached.stopsById).map(s => s.stop_name));

    if (!src || !dst) {
      return res.status(404).json({ message: 'Could not resolve from/to stop' });
    }

    // Run A* (transfer-aware)
    const result = aStar({
      startStopId: src.stop_id,
      goalStopId: dst.stop_id,
      graph: cached.graph,
      stopsById: cached.stopsById,
      linesById: cached.linesById,
      optimizeFor: opt, // 'fast' | 'few_transfers' | 'balanced'
    });

    // Fare model: flat per boarding (default 1,500 ៛). Transfers = extra boarding.
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
      steps: result.steps  // detailed steps with line segments and stops
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Route planning failed', error: err.message });
  }
};
