const express = require('express');
const { register, googleLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/google', googleLogin);


module.exports = router;
