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

/**
 * @desc    Get all bound devices for the user
 * @route   GET /api/device
 * @access  Private
 */
exports.getDevices = async (req, res) => {
    try {
        const devices = await Device.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Unbind / delete a device
 * @route   DELETE /api/device/:id
 * @access  Private
 */
exports.unbindDevice = async (req, res) => {
    try {
        const device = await Device.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found or not authorized'
            });
        }

        await device.destroy();

        res.status(200).json({
            success: true,
            message: 'Device successfully unbound',
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
