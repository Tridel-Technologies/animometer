const express = require('express');
const { getCruises, saveCruise } = require('../controller/shipScheduleController');

const router = express.Router();

router.get('/', getCruises);
router.post('/', saveCruise);

module.exports = router;
