const express = require('express');
const { createSafeZone, getSafeZones, deleteSafeZone } = require('../controllers/safeZoneController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createSafeZone);
router.get('/', protect, getSafeZones);
router.delete('/:id', protect, deleteSafeZone);

module.exports = router;
