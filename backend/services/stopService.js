const axios = require("../config/axiosClient");

const stopService = {
  async searchStops(query) {
    try {
      const params = {
        resource_id: "8efae0bf-319e-4ca5-9f6a-4fb75129ea3d",
        limit: 1000, // fetch all stops
      };

      const response = await axios.get("/datastore_search", { params });

      const stopsData = response.data.result.records;

      // Build a set of unique stops with all searchable fields
      const stopSet = new Set();

      stopsData.forEach((record) => {
        // if (record.departure) stopSet.add(record.departure);
        // if (record.terminal) stopSet.add(record.terminal);
        if (record.operating_) {
          record.operating_.split(",").forEach((s) => stopSet.add(s.trim()));
        }
      });

      // Perform text search (inform search) over all stops
      const filteredStops = Array.from(stopSet)
        .filter((stop) =>
          stop.toLowerCase().includes((query || "").toLowerCase())
        )
        .map((name) => ({ name }));

      return {
        totalResults: filteredStops.length,
        records: filteredStops,
      };
    } catch (error) {
      throw new Error(error.message || "Error fetching stops");
    }
  },
};

module.exports = stopService;
