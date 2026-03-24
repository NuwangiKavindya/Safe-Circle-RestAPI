const express = require('express');
const { bindDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/bind', protect, bindDevice);

module.exports = router;
