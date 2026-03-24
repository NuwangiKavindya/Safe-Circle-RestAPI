const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, confirmPassword } = req.body;

        // Validation for missing fields
        if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields including password confirmation.',
            });
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match.',
            });
        }

        // Check if user already exists based on email or phone
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists.',
            });
        }

        const existingPhone = await User.findOne({ where: { phoneNumber } });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone number already exists.',
            });
        }

        // Create the user
        const user = await User.create({
            fullName,
            email,
            phoneNumber,
            password,
        });

        // Generate token and respond
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            token,
            data: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        });
    } catch (error) {
        // Handle mongoose validation errors
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
