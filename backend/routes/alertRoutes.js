const express = require('express');
const { triggerAlert, resolveAlert, getActiveAlerts } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, triggerAlert);
router.put('/:id/resolve', protect, resolveAlert);
router.get('/active', protect, getActiveAlerts);

module.exports = router;
