# SafeCircle Development Issues, Challenges & Resolutions

This document records the technical challenges, runtime errors, and architectural obstacles encountered during the development of **SafeCircle**, along with their detailed root causes and implemented solutions.

---

## 1. Multi-Platform Google SSO Token Verification Failure

### Issue Description
When mobile clients (iOS and Android) attempted to log in using Google Single Sign-On (SSO), the backend rejected incoming `idToken` payloads with `401 Invalid Google ID token` errors, despite valid authentication on the native mobile clients.

### Root Cause
Google OAuth issues separate Client IDs for each platform (Web, iOS, Android). The backend `google-auth-library` was originally configured to verify incoming tokens against a single Web Client ID (`GOOGLE_CLIENT_ID`). When an iOS or Android client generated an ID token using its respective native Client ID, `verifyIdToken` threw an audience mismatch exception.

### Resolution
Updated `authController.js` to accept an array of valid client IDs for token audience verification:
- Environment variables were updated in `.env` to store `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, and `GOOGLE_ANDROID_CLIENT_ID`.
- Verification logic in `authController.js` was modified to construct `validAudiences` dynamically and pass the array to `client.verifyIdToken({ idToken, audience: validAudiences })`.

---

## 2. Native iOS & Android OAuth Scheme & Plist Configuration

### Issue Description
Clicking "Continue with Google" on native devices either crashed the application or failed to trigger the Google login redirect/consent screen.

### Root Cause
- **iOS**: The native iOS app lacked the required reversed client ID URL scheme in `Info.plist` and missing `GoogleService-Info.plist` configuration.
- **Android**: Gradle build configurations lacked proper `google-services.json` integration and API level 35 compatibility settings.

### Resolution
- **iOS**: 
  - Added `GoogleService-Info.plist` to the Xcode project directory (`frontend/ios/SafeCircleApp/GoogleService-Info.plist`).
  - Added `CFBundleURLTypes` to `Info.plist` registering `com.googleusercontent.apps.342423658982-3sj5f5oiuv6hqduk15mtv69jtet1li4v` for deep-link OAuth callbacks.
- **Android**: Added `google-services.json` under `frontend/android/app/` and updated root and app `build.gradle` files.

---

## 3. Android Emulator Metro Bundler Connection Error (`Cannot connect to Metro`)

### Issue Description
Launching the Android build using `npm run android` caused a red screen error in the emulator:
`Cannot connect to Metro. URL: 10.0.2.2:8081`.

### Root Cause
The Android emulator runs inside a virtual network where `10.0.2.2` maps to host `127.0.0.1`. However, TCP port 8081 on the emulator was not forwarded to the host's Metro bundler instance, and the backend server was listening strictly on `localhost` rather than binding to all interfaces.

### Resolution
- Executed ADB reverse port forwarding: `adb reverse tcp:8081 tcp:8081`.
- Configured Express server in `backend/server.js` to listen on host `0.0.0.0` (`server.listen(PORT, '0.0.0.0')`) so local physical devices and emulators can reach API endpoints.

---

## 4. Real-Time Tracking Latency & High Overhead with HTTP Polling

### Issue Description
The device location tracking feature initially relied on short-interval HTTP polling to fetch location logs. This resulted in high network overhead, battery drain on mobile clients, and delayed location updates on the tracker dashboard.

### Root Cause
HTTP polling requires establishing new TCP connections repeatedly and querying the database on every interval, regardless of whether new location coordinates exist. Furthermore, the `verifyAccessCode` endpoint did not return the target `deviceId`, preventing clients from joining room-specific socket channels.

### Resolution
- Replaced HTTP polling with a real-time **Socket.IO (WebSocket)** event-driven architecture.
- Modified `verifyAccessCode` in `verifyController.js` to return `deviceId` upon successful code verification.
- Added a Socket.IO connection in React Native `App.tsx` that joins device-specific rooms (`join-device-room`) and listens to real-time `location-broadcast` events with duplicate coordinate filtering.

---

## 5. Account Linking Conflicts & Development Sandbox Testing

### Issue Description
1. Users who registered via Google SSO were unable to set or log in with a local password later.
2. Development and testing of Google Sign-In on emulators lacking Google Play Services caused native SDK crashes.

### Root Cause
1. User registration logic strictly separated `authProvider === 'google'` from `'local'`, rejecting password updates or traditional logins for Google-created accounts.
2. Native `GoogleSignin` calls depend on Google Play Services, which are unavailable or unauthenticated on standard dev emulators.

### Resolution
- **Account Upgrades**: Modified `register` in `authController.js` to detect existing Google SSO accounts and allow attaching local password credentials (upgrading `authProvider` to `'local'`).
- **Sandbox Fallback**: Added a development sandbox token handler (`sandbox-google-token:::email:::name`) and fallback authentication logic to test Google auth flows seamlessly in dev environments.

---

## 6. Password Input Usability on Mobile Keyboards

### Issue Description
Users frequently made entry errors on mobile touch keyboards during registration and login due to hidden password text fields with no reveal option.

### Root Cause
`TextInput` components used static `secureTextEntry={true}` props without stateful visibility toggling.

### Resolution
- Created custom `View` input containers in `App.tsx` with state hooks (`showPassword`, `showSignUpPassword`, `showSignUpConfirmPassword`).
- Added interactive toggle buttons (`👁️ / 🙈`) allowing users to preview passwords before submission across Sign In, Sign Up, and Confirm Password screens.
