function heuristic(a, b) {
  // Placeholder heuristic: straight-line estimate
  // Later, replace with Haversine formula using GPS coordinates
  return Math.abs(a.charCodeAt(0) - b.charCodeAt(0));
}

module.exports = { heuristic };
