// controllers/stopController.js
const stopService = require('../services/stopService');

const stopController = {
  async getStops(req, res) {
    try {
      const query = req.query.q || '';
      const data = await stopService.searchStops(query);

      res.json({
        success: true,
        totalResults: data.totalResults,
        records: data.records
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = stopController;
