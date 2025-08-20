// graphBuilder
const { haversineKm } = require('../utils/haversine');
const { AVG_BUS_SPEED_KMPH } = require('../config/constants');

// Lines dataset from CKAN (contains line name, operating_ with stops, etc.)
const RESOURCE_ID = '8efae0bf-319e-4ca5-9f6a-4fb75129ea3d';

// Map CKAN fields
const FIELD_MAP = {
  line: {
    id: 'map_id',
    name: 'name',
    distance_km: 'distance_k',
    stops: 'operating_'   // stops list in one string
  }
};

async function fetchAllLines(resource_id, limit = 1000) {
  const axios = require('../config/axiosClient');
  const { data } = await axios.get('/datastore_search', {
    params: { resource_id, limit }
  });
  return data?.result?.records || [];
}

async function buildGraph() {
  const fL = FIELD_MAP.line;
  const lineRows = await fetchAllLines(RESOURCE_ID);

  const linesById = {};
  const stopsById = {};
  const stopsByLine = {};
  const graph = {}; // stopId -> edges

  const ensure = (id) => (graph[id] ||= []);

  for (const r of lineRows) {
    const lid = String(r[fL.id]);
    const lineName = r[fL.name];

    linesById[lid] = {
      line_id: lid,
      name: lineName,
      distance_km: Number(r[fL.distance_km] || 0)
    };

    // Parse stops from `operating_`
    const stopNames = (r[fL.stops] || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    stopsByLine[lid] = [];
    stopNames.forEach((name, idx) => {
      const sid = `${lid}_S${idx + 1}`;
      const stop = {
        stop_id: sid,
        stop_name: name,
        lat: 0,  // ?? no coordinates in CKAN dataset
        lon: 0,
        line_id: lid,
        seq: idx + 1,
        line_names: [lineName]
      };
      stopsById[sid] = stop;
      stopsByLine[lid].push(stop);
    });

    // Build graph edges between consecutive stops
    const seqStops = stopsByLine[lid];
    for (let i = 0; i < seqStops.length - 1; i++) {
      const a = seqStops[i], b = seqStops[i + 1];
      // Since no coordinates, just estimate distance by line total / stops
      const dist = (linesById[lid].distance_km || 0) / (seqStops.length - 1);
      const timeMin = (dist / AVG_BUS_SPEED_KMPH) * 60;

      ensure(a.stop_id).push({ to: b.stop_id, line_id: lid, distance_km: dist, time_min: timeMin });
      ensure(b.stop_id).push({ to: a.stop_id, line_id: lid, distance_km: dist, time_min: timeMin });
    }
  }

  return { graph, stopsById, linesById };
}

module.exports = { buildGraph };
