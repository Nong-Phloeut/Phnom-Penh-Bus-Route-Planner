const express = require('express');
const cors = require('cors');
const routes = require('./routes/planner');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/navigation', routes);

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
