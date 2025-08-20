// routes/index.js
const express = require('express');
const router = express.Router();

const stopRoutes = require('./stopRoutes');
const plannerRoutes = require('./planner');

// All route groups
router.use('/api/stop', stopRoutes);
router.use('/api/planner', plannerRoutes);

module.exports = router;
