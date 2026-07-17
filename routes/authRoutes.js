const express = require('express');
const { register, googleLogin, login } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

module.exports = router;
