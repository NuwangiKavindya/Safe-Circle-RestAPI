const express = require('express');
const { addContact, getContacts, deleteContact, updateSharingMode } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, addContact);
router.get('/', protect, getContacts);
router.delete('/:id', protect, deleteContact);
router.put('/:id/sharing-mode', protect, updateSharingMode);

module.exports = router;
