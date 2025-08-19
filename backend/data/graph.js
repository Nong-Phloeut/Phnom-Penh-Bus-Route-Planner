// Example bus stop connections (with distances in km or minutes)
const graph = {
  A: { B: 2, C: 4 },
  B: { A: 2, D: 5, E: 10 },
  C: { A: 4, F: 3 },
  D: { B: 5, E: 2 },
  E: { B: 10, D: 2, F: 1 },
  F: { C: 3, E: 1 }
};

module.exports = graph;
