// routes/stopRoutes.js
const express = require('express');
const router = express.Router();
const stopController = require('../controllers/stopController');

// GET /api/stops?q=searchTerm
router.get('/', stopController.getStops);

module.exports = router;
