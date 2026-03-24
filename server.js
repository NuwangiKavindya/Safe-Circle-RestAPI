const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB, sequelize } = require('./config/db');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger Setup
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Lost Phone Tracker API',
            version: '1.0.0',
            description: 'API Documentation for the Mobile Phone Tracker application including User Registration and Authentication.',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 5000}`,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./server.js', './routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsDoc(options);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(specs));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phoneNumber
 *               - password
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *       400:
 *         description: Validation error or missing fields
 *       500:
 *         description: Server error
 */
app.use('/api/auth', authRoutes);

/**
 * @swagger
 * /api/device/bind:
 *   post:
 *     summary: Bind a new device to the authenticated user
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceName
 *               - deviceModel
 *               - imeiNumber
 *               - deviceOs
 *             properties:
 *               deviceName:
 *                 type: string
 *               deviceModel:
 *                 type: string
 *               imeiNumber:
 *                 type: string
 *               deviceOs:
 *                 type: string
 *     responses:
 *       201:
 *         description: Device successfully bound
 *       400:
 *         description: Missing fields or IMEI already in use
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
app.use('/api/device', deviceRoutes);

const PORT = process.env.PORT || 5001;

// Sync DB & Start server
sequelize.sync({ alter: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync db: ' + err.message);
});
