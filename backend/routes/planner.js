const express = require('express');
const router = express.Router();
const { planRoute } = require('../controllers/plannerController');

// GET /api/planner?from=Freedom%20Park&to=Stueng%20Mean%20Chey%20Intersection&opt=balanced
router.get('/', planRoute);

module.exports = router;
