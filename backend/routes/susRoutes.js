const express = require('express');
const { submitSusFeedback, getSusSummary } = require('../controllers/susController');

const router = express.Router();

router.post('/submit', submitSusFeedback);
router.get('/results', getSusSummary);

module.exports = router;
