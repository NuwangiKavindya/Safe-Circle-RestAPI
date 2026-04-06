const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE_DAYS * 60 * 60 * 60 * 24,
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

/**
 * @desc    Google Sign-In integration
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleLogin = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Missing idToken' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Check if user exists
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // User doesn't exist, create a new one
            user = await User.create({
                fullName: name,
                email,
                authProvider: 'google',
                googleId,
            });
        } else {
            // User exists, just link their googleId if not linked yet
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        }

        const token = generateToken(user.id);

        res.status(200).json({
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
        console.error('Verify ID token error: ', error);
        res.status(401).json({
            success: false,
            message: 'Invalid Google ID token',
        });
    }
};
