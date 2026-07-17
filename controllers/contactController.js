const TrustedContact = require('../models/TrustedContact');

/**
 * @desc    Add a trusted contact
 * @route   POST /api/contacts
 * @access  Private
 */
exports.addContact = async (req, res) => {
    try {
        const { contactName, contactPhone, contactEmail, relationship } = req.body;

        // Validation
        if (!contactName || !contactPhone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both contactName and contactPhone',
            });
        }

        // Create contact (the beforeCreate hook automatically sets the unique 6-digit accessCode)
        const contact = await TrustedContact.create({
            userId: req.user.id,
            contactName,
            contactPhone,
            contactEmail,
            relationship,
            isVerified: false
        });

        res.status(201).json({
            success: true,
            data: contact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get all trusted contacts for logged in user
 * @route   GET /api/contacts
 * @access  Private
 */
exports.getContacts = async (req, res) => {
    try {
        const contacts = await TrustedContact.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Delete a trusted contact
 * @route   DELETE /api/contacts/:id
 * @access  Private
 */
exports.deleteContact = async (req, res) => {
    try {
        const contact = await TrustedContact.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Trusted contact not found or not authorized'
            });
        }

        await contact.destroy();

        res.status(200).json({
            success: true,
            message: 'Trusted contact removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
