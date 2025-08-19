// const express = require('express');
// const cors = require('cors');
// const plannerRoutes = require('./routes/planner');
// const axios = require('axios');

// const app = express();
// const port = 3000;

// app.use(cors());
// app.use(express.json());

// // app.use('/api/navigation', routes);

// app.get('/api/test', async (req, res) => {
//   try {
//     const params = {
//       resource_id: '8efae0bf-319e-4ca5-9f6a-4fb75129ea3d',
//       limit: 5,
//       q: req.query.q || '' // optional query parameter
//     };

//     const response = await axios.get(
//       'https://data.opendevelopmentcambodia.net/en/api/3/action/datastore_search',
//       { params }
//     );

//     res.json({
//       totalResults: response.data.result.total,
//       records: response.data.result.records
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: 'Error fetching data from API',
//       error: error.message
//     });
//   }
// });

// app.use('/api/planner', plannerRoutes);

// app.listen(port, () => {
//   console.log(`Backend running at http://localhost:${port}`);
// });


const express = require('express');
const cors = require('cors');
const plannerRoutes = require('./routes/planner');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/planner', plannerRoutes);

app.listen(port, () => {
  console.log(`🚍 Bus AI Planner running at http://localhost:${port}`);
});
