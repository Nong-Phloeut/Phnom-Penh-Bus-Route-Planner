// Phnom Penh city bus: typical flat fare ~1500៛ per ride.
// Assumptions (tune to reality as you refine data):
module.exports = {
  FARE_RIEL: 1500,              // per boarding
  AVG_BUS_SPEED_KMPH: 18,       // conservative urban speed incl. dwell times
  TRANSFER_PENALTY_MIN: 6,      // time pain to change lines (walking/waiting)
  WAIT_TIME_MIN: 5,             // average wait when boarding a line
  // weights for multi-objective A*
  COST_WEIGHTS: {
    fast:           { time: 1.0, transfer: 0.1, distance: 0.05 },
    few_transfers:  { time: 0.6, transfer: 3.0, distance: 0.05 },
    balanced:       { time: 1.0, transfer: 1.0, distance: 0.05 }
  }
};
