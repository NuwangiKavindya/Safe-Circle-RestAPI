const express = require('express');
const { bindDevice, getDevices, unbindDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/bind', protect, bindDevice);
router.get('/', protect, getDevices);
router.delete('/:id', protect, unbindDevice);

module.exports = router;
