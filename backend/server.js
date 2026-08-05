const express = require('express');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const cors = require('cors');
const { connectDB, sequelize } = require('./config/db');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

// Import models to register them with Sequelize
const User = require('./models/User');
const Device = require('./models/Device');
const TrustedContact = require('./models/TrustedContact');
const LocationLog = require('./models/LocationLog');
const Alert = require('./models/Alert');
const SafeZone = require('./models/SafeZone');

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const contactRoutes = require('./routes/contactRoutes');
const locationRoutes = require('./routes/locationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const safeZoneRoutes = require('./routes/safeZoneRoutes');

const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Attach socket.io engine to app so controllers can trigger socket events
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        const bodyCopy = { ...req.body };
        if (bodyCopy.password) bodyCopy.password = '[REDACTED]';
        if (bodyCopy.confirmPassword) bodyCopy.confirmPassword = '[REDACTED]';
        console.log(`  Body: ${JSON.stringify(bodyCopy)}`);
    }
    next();
});

// Serve static assets and uploads folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Authenticate a user via Google SSO
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: The Google ID token received from the client
 *     responses:
 *       200:
 *         description: User authenticated successfully
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
 *         description: Missing idToken
 *       401:
 *         description: Invalid Google ID token
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
app.use('/api/contacts', contactRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/contacts/shared', verifyRoutes);
app.use('/api/geofence', safeZoneRoutes);

// Haversine Distance helper for Geofence evaluation (meters)
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join device room to receive location updates for a specific device
    socket.on('join-device-room', (data) => {
        const { deviceId } = data;
        if (deviceId) {
            socket.join(`device-${deviceId}`);
            console.log(`Socket ${socket.id} joined room: device-${deviceId}`);
        }
    });

    // Real-Time Location Update event from physical device GPS
    socket.on('location_update', async (data) => {
        const { deviceId, latitude, longitude, accuracy, speed, heading, timestamp } = data;
        if (!deviceId || latitude === undefined || longitude === undefined) {
            return;
        }

        console.log(`[Socket.IO] Real-time location update received for device-${deviceId}: ${latitude}, ${longitude}`);

        const payload = {
            deviceId,
            latitude,
            longitude,
            accuracy: accuracy || 5.0,
            speed: speed || 0,
            heading: heading || 0,
            timestamp: timestamp || new Date().toISOString()
        };

        // 1. Broadcast immediately to any connected trusted contact watching this device room
        io.to(`device-${deviceId}`).emit('location-broadcast', payload);

        // 2. Asynchronously persist location log to database
        try {
            await LocationLog.create({
                deviceId,
                latitude,
                longitude,
                accuracy: accuracy || 5.0
            });
        } catch (err) {
            console.error('[Socket.IO] Failed to persist location update:', err.message);
        }

        // 3. Geofence Breach Check: Verify if coordinates breach any active user Safe Zones
        try {
            const device = await Device.findByPk(deviceId);
            if (device && device.userId) {
                const activeSafeZones = await SafeZone.findAll({
                    where: { userId: device.userId, isActive: true }
                });

                if (activeSafeZones.length > 0) {
                    let insideAnyZone = false;
                    let breachedZones = [];

                    for (const zone of activeSafeZones) {
                        const dist = calculateDistanceMeters(
                            parseFloat(latitude),
                            parseFloat(longitude),
                            parseFloat(zone.latitude),
                            parseFloat(zone.longitude)
                        );

                        if (dist <= parseFloat(zone.radiusMeters)) {
                            insideAnyZone = true;
                        } else {
                            breachedZones.push({ zoneName: zone.zoneName, distance: Math.round(dist), radius: zone.radiusMeters });
                        }
                    }

                    if (!insideAnyZone) {
                        console.warn(`[GEOFENCE ALERT] Device ${deviceId} breached safe zones! Current coordinates: ${latitude}, ${longitude}`);
                        io.to(`device-${deviceId}`).emit('geofence-breach', {
                            deviceId,
                            latitude,
                            longitude,
                            breachedZones,
                            timestamp: new Date().toISOString(),
                            message: `⚠️ GEOFENCE WARNING: Device exited designated safe zones!`
                        });
                    }
                }
            }
        } catch (geofenceErr) {
            console.error('[GEOFENCE] Error evaluating geofence breach:', geofenceErr.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5001;

// Sync DB & Start server
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT} (0.0.0.0)`);
    });
}).catch(err => {
    console.error('Failed to sync db: ' + err.message);
});
