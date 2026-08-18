const path = require('path');
const fs = require('fs');

let admin = null;
try {
  admin = require('firebase-admin');
  const serviceAccountPath = path.join(__dirname, '../config/safe-circle-firebase-key.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[PushService] ✅ Firebase Admin SDK initialized successfully.');
  } else {
    console.log('[PushService] ℹ️ Firebase service key not found at config/safe-circle-firebase-key.json. Running in fallback mode.');
  }
} catch (error) {
  console.warn('[PushService] Could not initialize firebase-admin:', error.message);
  admin = null;
}

/**
 * Send High-Priority Emergency Push Notification via FCM
 * @param {Array<string>} targetTokens Array of destination device FCM Tokens
 * @param {Object} alertPayload Alert metadata (ownerName, alertId, latitude, longitude, alertType)
 */
async function sendEmergencyPushNotification(targetTokens, alertPayload) {
  if (!targetTokens || !Array.isArray(targetTokens) || targetTokens.length === 0) {
    console.log('[PushService] No FCM target tokens provided. Skipping push notification.');
    return { success: false, reason: 'NO_TOKENS' };
  }

  const validTokens = targetTokens.filter(t => typeof t === 'string' && t.trim().length > 0);
  if (validTokens.length === 0) return { success: false, reason: 'INVALID_TOKENS' };

  const message = {
    notification: {
      title: `🚨 EMERGENCY ALERT: ${alertPayload.ownerName || 'SafeCircle User'}`,
      body: alertPayload.message || 'Emergency SOS or Theft Anomaly detected. Tap to open live tracker dashboard.',
    },
    data: {
      alertId: String(alertPayload.alertId || ''),
      deviceId: String(alertPayload.deviceId || ''),
      latitude: String(alertPayload.latitude || ''),
      longitude: String(alertPayload.longitude || ''),
      alertType: String(alertPayload.alertType || 'SOS'),
      screen: 'TRACKER_DASHBOARD',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'safecircle_emergency_channel',
        sound: 'default',
        priority: 'max',
        visibility: 'public',
      },
    },
    tokens: validTokens,
  };

  if (admin && admin.apps && admin.apps.length > 0) {
    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(`[PushService] 🚀 FCM Multicast sent successfully to ${response.successCount} / ${validTokens.length} devices.`);
      return { success: true, response };
    } catch (err) {
      console.error('[PushService Error] Failed to send FCM push:', err);
      return { success: false, error: err };
    }
  } else {
    console.log(`[PushService Mock] 📱 High-Priority System Tray Push simulated for ${validTokens.length} devices: "${message.notification.title}"`);
    return { success: true, simulated: true };
  }
}

module.exports = {
  sendEmergencyPushNotification,
};
