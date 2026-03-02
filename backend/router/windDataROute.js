const express = require('express');
const { fetchWindData } = require('../controller/stationData');
const router = express.Router();

router.get('/wind-data', fetchWindData);

module.exports = router;
