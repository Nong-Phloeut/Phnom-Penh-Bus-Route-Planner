const axios = require('axios');

const axiosClient = axios.create({
  baseURL: 'https://data.opendevelopmentcambodia.net/en/api/3/action',
  timeout: 5000
});

module.exports = axiosClient;
