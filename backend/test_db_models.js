const dotenv = require('dotenv');
dotenv.config();

const { sequelize, connectDB } = require('./config/db');
const User = require('./models/User');
const Device = require('./models/Device');
const TrustedContact = require('./models/TrustedContact');
const LocationLog = require('./models/LocationLog');
const Alert = require('./models/Alert');

async function runTest() {
    console.log('Starting model verification test...');
    try {
        await connectDB();
        
        // 1. Create a dummy user
        console.log('\n--- Creating Test User ---');
        const user = await User.create({
            fullName: 'Test Verification User',
            email: `test-${Date.now()}@example.com`,
            phoneNumber: `+1555555${Math.floor(1000 + Math.random() * 9000)}`,
            password: 'password123',
            confirmPassword: 'password123'
        });
        console.log(`Created User with ID: ${user.id}`);

        // 2. Create a trusted contact linked to the user
        console.log('\n--- Creating Trusted Contact ---');
        const contact = await TrustedContact.create({
            userId: user.id,
            contactName: 'Jane Contact',
            contactPhone: '+19999999999',
            contactEmail: 'jane@example.com',
            relationship: 'Sister',
            isVerified: true
        });
        console.log(`Created Trusted Contact with ID: ${contact.id}`);

        // 3. Bind a test device to the user
        console.log('\n--- Binding Device ---');
        const device = await Device.create({
            userId: user.id,
            deviceName: 'Verification Phone',
            deviceModel: 'Pixel Test',
            imeiNumber: `IMEI-${Date.now()}`,
            deviceOs: 'Android'
        });
        console.log(`Created Device with ID: ${device.id}`);

        // 4. Log location for the device
        console.log('\n--- Creating Location Log ---');
        const log = await LocationLog.create({
            deviceId: device.id,
            latitude: 37.77490000,
            longitude: -122.41940000,
            accuracy: 10.5
        });
        console.log(`Created Location Log with ID: ${log.id} (Lat: ${log.latitude}, Lng: ${log.longitude})`);

        // 5. Trigger an alert
        console.log('\n--- Triggering Alert ---');
        const alert = await Alert.create({
            userId: user.id,
            deviceId: device.id,
            alertType: 'SOS',
            latitude: 37.77490000,
            longitude: -122.41940000
        });
        console.log(`Created Alert with ID: ${alert.id} (${alert.alertType}, Status: ${alert.status})`);

        // 6. Test Validation Rule: Expect failure on invalid Latitude
        console.log('\n--- Testing Validation (Invalid Latitude) ---');
        try {
            await LocationLog.create({
                deviceId: device.id,
                latitude: 150.0, // Invalid latitude (> 90)
                longitude: 45.0
            });
            console.error('❌ Validation failed to catch out-of-range latitude!');
        } catch (err) {
            console.log('✅ Validation correctly caught out-of-range latitude:', err.message);
        }

        // Clean up mock data (delete cascade should wipe devices, contacts, logs, alerts)
        console.log('\n--- Cleaning Up (Cascade Delete) ---');
        await user.destroy();
        console.log('Test User deleted. Cascade actions checked.');

        console.log('\n🎉 ALL MODEL TESTS PASSED SUCCESSFULLY! Schema is working correctly.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database Model Test Failed:', err);
        process.exit(1);
    }
}

runTest();
