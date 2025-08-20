const axios = require("axios");
const https = require("https");

const axiosClient = axios.create({
  baseURL: "https://data.opendevelopmentcambodia.net/en/api/3/action",
  timeout: 5000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // disables SSL check
  }),
});

module.exports = axiosClient;
