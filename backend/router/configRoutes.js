const express = require('express');
const router = express.Router();
const configController = require('../controller/configController');

router.get('/sensor-config', configController.getSensorConfig);
router.post('/sensor-config', configController.updateSensorConfig);
router.get('/initial-units', configController.getInitialUnits);
router.post('/initial-units', configController.updateInitialUnits);
router.get('/station', configController.getStation);
router.post('/station', configController.updateStation);

module.exports = router;
