const express = require('express');
const { register, googleLogin, login, updatePhoneNumber, updateAlarmSound } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/update-phone', protect, updatePhoneNumber);
router.put('/alarm-sound', protect, updateAlarmSound);

module.exports = router;
