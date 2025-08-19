// const express = require('express');
// const router = express.Router();
// const routeService = require('../services/routeService');

// router.post('/', (req, res) => {
//   const { from, to } = req.body;

//   if (!from || !to) {
//     return res.status(400).json({ message: 'Please provide both from and to stops.' });
//   }

//   try {
//     const result = routeService.findBestRoute(from, to);
//     res.json(result);
//   } catch (err) {
//     res.status(err.status || 500).json({ message: err.message });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const { planRoute } = require('../controllers/plannerController');

// GET /api/planner?from=Freedom%20Park&to=Stueng%20Mean%20Chey%20Intersection&opt=balanced
router.get('/', planRoute);

module.exports = router;
