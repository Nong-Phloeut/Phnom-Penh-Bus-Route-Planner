const { haversineKm } = require('../utils/haversine');
const { AVG_BUS_SPEED_KMPH } = require('../config/constants');

// Lines resource (still fetch from CKAN)
const RES_LINES = '8efae0bf-319e-4ca5-9f6a-4fb75129ea3d'; // lines meta (name, fare, distance_k, etc.)

// Map your CKAN fields here
const FIELD_MAP = {
  line: {
    id: 'map_id',
    name: 'name',
    distance_km: 'distance_k'
  },
  stop: {
    id: 'stop_id',
    name: 'stop_name',
    lat: 'lat',
    lon: 'lon',
    lineId: 'line_id',
    seq: 'sequence'
  }
};

// Mock stops dataset
const stopRows = [
  { stop_id: 'S1', stop_name: 'Freedom Park', lat: 11.556, lon: 104.928, line_id: '2', seq: 1 },
  { stop_id: 'S2', stop_name: 'National Road No 5', lat: 11.558, lon: 104.931, line_id: '2', seq: 2 },
  { stop_id: 'S3', stop_name: 'Kouch Kanong Roundabout', lat: 11.560, lon: 104.935, line_id: '2', seq: 3 },
  { stop_id: 'S4', stop_name: 'Wat Phnom', lat: 11.565, lon: 104.938, line_id: '2', seq: 4 },
  { stop_id: 'S5', stop_name: 'Central Market', lat: 11.570, lon: 104.940, line_id: '2', seq: 5 },
  { stop_id: 'S6', stop_name: 'Borey Santepheap 2', lat: 11.575, lon: 104.945, line_id: '2', seq: 6 },

  { stop_id: 'S7', stop_name: 'Sleng Pagoda', lat: 11.550, lon: 104.920, line_id: '11', seq: 1 },
  { stop_id: 'S8', stop_name: 'Prey Sa Road', lat: 11.552, lon: 104.922, line_id: '11', seq: 2 },
  { stop_id: 'S9', stop_name: 'Stueng Mean Chey Intersection', lat: 11.555, lon: 104.925, line_id: '11', seq: 3 }
];

async function fetchAllLines(resource_id, limit=1000) {
  // naive fetch lines from CKAN
  const axios = require('../config/axiosClient');
  const { data } = await axios.get('/datastore_search', { params: { resource_id, limit }});
  return data?.result?.records || [];
}

function sortStopsBySeq(stops, f) {
  return stops.sort((a,b) => (Number(a[f.seq]) || 0) - (Number(b[f.seq]) || 0));
}

async function buildGraph() {
  const fL = FIELD_MAP.line;
  const fS = FIELD_MAP.stop;

  const lineRows = await fetchAllLines(RES_LINES);

  // lines
  const linesById = {};
  for (const r of lineRows) {
    const id = String(r[fL.id]);
    linesById[id] = {
      line_id: id,
      name: r[fL.name],
      distance_km: Number(r[fL.distance_km] || 0)
    };
  }

  // stops grouped by line, ordered by sequence
  const stopsByLine = {};
  const stopsById = {};
  for (const r of stopRows) {
    const sid = String(r[fS.id]);
    const lid = String(r[fS.lineId]);
    const stop = {
      stop_id: sid,
      stop_name: r[fS.name],
      lat: Number(r[fS.lat]),
      lon: Number(r[fS.lon]),
      line_id: lid,
      seq: Number(r[fS.seq])
    };
    stopsById[sid] = stop;
    if (!stopsByLine[lid]) stopsByLine[lid] = [];
    stopsByLine[lid].push(stop);
  }
  for (const lid of Object.keys(stopsByLine)) {
    stopsByLine[lid] = sortStopsBySeq(stopsByLine[lid], fS);
  }

  // build adjacency: edges between consecutive stops on each line
  const graph = {}; // stopId -> array of { to, line_id, distance_km, time_min }
  const ensure = (id) => (graph[id] ||= []);

  for (const [lid, seqStops] of Object.entries(stopsByLine)) {
    for (let i = 0; i < seqStops.length - 1; i++) {
      const a = seqStops[i], b = seqStops[i+1];
      const dist = haversineKm(a, b);
      const timeMin = (dist / AVG_BUS_SPEED_KMPH) * 60;

      ensure(a.stop_id).push({ to: b.stop_id, line_id: lid, distance_km: dist, time_min: timeMin });
      ensure(b.stop_id).push({ to: a.stop_id, line_id: lid, distance_km: dist, time_min: timeMin });
    }
  }

  // decorate stops with line names for nicer matching
  for (const stop of Object.values(stopsById)) {
    stop.line_names = [ linesById[stop.line_id]?.name ].filter(Boolean);
  }

  return { graph, stopsById, linesById };
}

module.exports = { buildGraph };
