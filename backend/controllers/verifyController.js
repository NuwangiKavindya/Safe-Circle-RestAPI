const TrustedContact = require('../models/TrustedContact');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Device = require('../models/Device');
const LocationLog = require('../models/LocationLog');

/**
 * @desc    Validate contact access code and check active emergency state
 * @route   POST /api/contacts/shared/verify
 * @access  Public
 */
exports.verifyAccessCode = async (req, res) => {
    try {
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a security access code.'
            });
        }

        // Find the trusted contact using access code
        const contact = await TrustedContact.findOne({
            where: { accessCode },
            include: [{ model: User, as: 'user' }]
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Invalid access code. Please check your credentials.'
            });
        }

        // Set contact as verified if they successfully enter it
        if (!contact.isVerified) {
            contact.isVerified = true;
            await contact.save();
        }

        // Query active alerts for the associated user
        const activeAlert = await Alert.findOne({
            where: {
                userId: contact.userId,
                status: 'ACTIVE'
            }
        });

        res.status(200).json({
            success: true,
            data: {
                contactName: contact.contactName,
                relationship: contact.relationship,
                targetUser: {
                    id: contact.user.id,
                    fullName: contact.user.fullName,
                    phoneNumber: contact.user.phoneNumber
                },
                isActiveSos: !!activeAlert,
                alertId: activeAlert ? activeAlert.id : null,
                audioFileUrl: activeAlert ? activeAlert.audioFileUrl : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Get real-time location logs for shared contact access code
 * @route   GET /api/location/shared/:accessCode
 * @access  Public (Secured by active SOS emergency verification)
 */
exports.getSharedLocationHistory = async (req, res) => {
    try {
        const { accessCode } = req.params;

        // 1. Authenticate relationship via access code
        const contact = await TrustedContact.findOne({
            where: { accessCode }
        });

        if (!contact) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid security code.'
            });
        }

        // 2. Validate emergency status (Enforce privacy: logs can only be read during ACTIVE SOS)
        const activeAlert = await Alert.findOne({
            where: {
                userId: contact.userId,
                status: 'ACTIVE'
            }
        });

        if (!activeAlert) {
            return res.status(403).json({
                success: false,
                message: 'Access forbidden. Geolocation logs are only visible during active emergency SOS events.'
            });
        }

        // 3. Find user's devices
        const devices = await Device.findAll({
            where: { userId: contact.userId }
        });

        if (devices.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                message: 'No registered tracking devices found for the user.'
            });
        }

        const deviceIds = devices.map(d => d.id);

        // 4. Retrieve location logs history
        const logs = await LocationLog.findAll({
            where: {
                deviceId: deviceIds
            },
            order: [['timestamp', 'DESC']],
            limit: 50
        });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
