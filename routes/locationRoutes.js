const express = require('express');
const { logLocation, getLocationHistory } = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/log', protect, logLocation);
router.get('/history/:deviceId', protect, getLocationHistory);

module.exports = router;
