const express = require('express');
const { register, googleLogin, login, updatePhoneNumber } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/update-phone', protect, updatePhoneNumber);

module.exports = router;
