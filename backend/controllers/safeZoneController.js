const SafeZone = require('../models/SafeZone');

/**
 * @desc    Create a new Safe Zone (Geofence)
 * @route   POST /api/geofence
 * @access  Private
 */
exports.createSafeZone = async (req, res) => {
    try {
        const { zoneName, latitude, longitude, radiusMeters } = req.body;

        if (!zoneName || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide zoneName, latitude, and longitude.',
            });
        }

        const safeZone = await SafeZone.create({
            userId: req.user.id,
            zoneName: zoneName.trim(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radiusMeters: radiusMeters ? parseFloat(radiusMeters) : 200.0,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            data: safeZone,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get all active safe zones for logged-in user
 * @route   GET /api/geofence
 * @access  Private
 */
exports.getSafeZones = async (req, res) => {
    try {
        const safeZones = await SafeZone.findAll({
            where: { userId: req.user.id, isActive: true },
            order: [['createdAt', 'DESC']],
        });

        res.status(200).json({
            success: true,
            count: safeZones.length,
            data: safeZones,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Delete / deactivate a Safe Zone
 * @route   DELETE /api/geofence/:id
 * @access  Private
 */
exports.deleteSafeZone = async (req, res) => {
    try {
        const safeZone = await SafeZone.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!safeZone) {
            return res.status(404).json({
                success: false,
                message: 'Safe zone not found or not authorized.',
            });
        }

        await safeZone.destroy();

        res.status(200).json({
            success: true,
            message: 'Safe zone removed successfully.',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
