const express = require('express');
const cors = require('cors');
const plannerRoutes = require('./routes/planner');
const axios = require('axios');
const https = require("https");
const routes = require('./routes'); 

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// use all routes
app.use(routes);

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});