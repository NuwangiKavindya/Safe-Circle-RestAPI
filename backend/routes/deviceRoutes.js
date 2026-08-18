const express = require('express');
const { bindDevice, getDevices, unbindDevice, updateFcmToken } = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/bind', protect, bindDevice);
router.post('/fcm-token', protect, updateFcmToken);
router.get('/', protect, getDevices);
router.delete('/:id', protect, unbindDevice);

module.exports = router;
