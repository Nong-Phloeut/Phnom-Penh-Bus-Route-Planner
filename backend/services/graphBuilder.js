const axios = require('../config/axiosClient');
const { haversineKm } = require('../utils/haversine');
const { AVG_BUS_SPEED_KMPH } = require('../config/constants');

// 👉 UPDATE these with your real resource_ids
const RES_LINES = '8efae0bf-319e-4ca5-9f6a-4fb75129ea3d'; // lines meta (name, fare, distance_k, etc.)
const RES_STOPS = 'REPLACE_WITH_STOPS_RESOURCE_ID';        // stops with line_id + sequence + lat/lon

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

async function fetchAll(resource_id, limit=1000) {
  // naive paginator; adjust if your dataset is larger
  let records = [];
  let offset = 0;
  while (true) {
    const { data } = await axios.get('/datastore_search', { params: { resource_id, limit, offset }});
    // console.log(`Fetched ${data?.result?.total || 0} records from ${resource_id} (offset=${offset})`);
    const batch = data?.result?.records || [];
    records = records.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return records;
}

function sortStopsBySeq(stops, f) {
  return stops.sort((a,b) => (Number(a[f.seq]) || 0) - (Number(b[f.seq]) || 0));
}

async function buildGraph() {
  const fL = FIELD_MAP.line;
  const fS = FIELD_MAP.stop;

  const [lineRows, stopRows] = await Promise.all([
    fetchAll(RES_LINES),
    fetchAll(RES_STOPS)
  ]);

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

  // build adjacency: edges between consecutive stops on each line (both directions)
  // edge cost carries distance and time estimate
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
