const express = require('express');
const { addContact, getContacts, deleteContact } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, addContact);
router.get('/', protect, getContacts);
router.delete('/:id', protect, deleteContact);

module.exports = router;
