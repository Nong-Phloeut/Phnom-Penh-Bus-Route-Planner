// plannerController.js
const { buildGraph } = require("../services/graphBuilder");
const { aStar } = require("../services/aStarService");
const { pickBestStop } = require("../utils/textMatch");
const { FARE_RIEL } = require("../config/constants");

// Cache graph so we don’t rebuild it on every request
let cached = null; 

/**
 * Main API for route planning
 * Example: GET /planRoute?from=Sleng+Pagoda&to=National+Road+No+5&opt=fast
 */
exports.planRoute = async (req, res) => {
  try {
    const { from, to, opt = "balanced" } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Query params required: from, to" });
    }

    // Step 1: Build or reuse the transport graph (nodes=stops, edges=bus segments)
    if (!cached) cached = await buildGraph();

    // Step 2: Match text input ("Sleng Pagoda") to actual stop IDs using fuzzy text search
    const src = pickBestStop(from, cached.stopsById);
    const dst = pickBestStop(to, cached.stopsById);

    if (!src || !dst) {
      return res.status(404).json({
        message: "Could not resolve from/to stop",
        fromResolved: src?.stop_name,
        toResolved: dst?.stop_name,
      });
    }

    // Step 3: Check if starting stop is connected
    if ((cached.graph[src.stop_id] || []).length === 0) {
      return res.status(404).json({
        message: "Start stop has no outgoing edges",
        stop: src.stop_name,
      });
    }

    // Step 4: Run **A* Search Algorithm** (AI Pathfinding)
    //   - Considers distance, time, and transfers
    //   - Uses heuristic to speed up search
    let result;
    try {
      result = aStar({
        startStopId: src.stop_id,
        goalStopId: dst.stop_id,
        graph: cached.graph,
        stopsById: cached.stopsById,
        linesById: cached.linesById,
        optimizeFor: opt, // "fast" | "few_transfers" | "balanced"
      });
    } catch (e) {
      return res.status(404).json({
        message: "No route found between selected stops",
        error: e.message,
      });
    }

    // Step 5: Simple fare calculation = base fare × number of boardings
    const totalBoardings = result.summary.transfers + 1;
    const fare = totalBoardings * FARE_RIEL;

    // Step 6: Return final result as JSON
    res.json({
      query: {
        from,
        to,
        resolvedFrom: src.stop_name,
        resolvedTo: dst.stop_name,
        optimizeFor: opt,
      },
      summary: {
        stops: result.summary.stops,
        distance_km: Number(result.summary.distance_km.toFixed(2)),
        eta_min: Math.round(result.summary.eta_min),
        transfers: result.summary.transfers,
        boardings: totalBoardings,
        fare_riel: fare,
      },
      steps: result.steps,   // step-by-step instructions
      context: result.context, // line summaries
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ message: "Route planning failed", error: err.message });
  }
};
