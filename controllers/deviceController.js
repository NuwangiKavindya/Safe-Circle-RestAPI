const Device = require('../models/Device');

/**
 * @desc    Bind a new device to the user
 * @route   POST /api/device/bind
 * @access  Private
 */
exports.bindDevice = async (req, res) => {
    try {
        const { deviceName, deviceModel, imeiNumber, deviceOs } = req.body;

        // Validation for missing fields
        if (!deviceName || !deviceModel || !imeiNumber || !deviceOs) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: deviceName, deviceModel, imeiNumber, deviceOs',
            });
        }

        // Check if device with same IMEI is already bounded
        const existingDevice = await Device.findOne({ where: { imeiNumber } });
        if (existingDevice) {
            return res.status(400).json({
                success: false,
                message: 'Device with this IMEI is already bound',
            });
        }

        // Create the device for the logged in user
        const device = await Device.create({
            userId: req.user.id,
            deviceName,
            deviceModel,
            imeiNumber,
            deviceOs
        });

        res.status(201).json({
            success: true,
            data: device
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
