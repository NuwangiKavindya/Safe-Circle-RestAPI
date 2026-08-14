# SafeCircle Project Progress & System Context Report

> **Purpose**: This document provides a comprehensive progress summary, architectural overview, and status report for the **SafeCircle** project. It is formatted to provide full contextual clarity for developers and AI assistants (e.g. Claude) continuing development on this system.

---

## 1. Project Overview & Research Context

* **Project Title**: SAFECIRCLE: Intelligent Mobile Security with Audio Alerts and Real-Time Tracking
* **Academic Context**: B.Sc. in Software Engineering Research Project (NSBM Green University)
* **Core Problem Statement**: Existing mobile tracking apps require devices to remain powered on and logged in, fail to provide trusted social network assistance, lack adaptive audio alerts, and compromise privacy. SafeCircle provides an integrated multi-layered mobile security architecture.
* **Workspace Directory**: `/Users/nuwangi/Desktop/research/safe-circle`
  * Frontend Application: `frontend/`
  * Backend Server: `backend/`
  * Project Documentation: `docs/`

---

## 2. Technology Stack & Key Dependencies

### Frontend (`frontend/package.json`)
* **Framework**: React Native (`v0.85.0`) with TypeScript
* **Map Engine**: `@maplibre/maplibre-react-native` (`v11.3.6`) for vector satellite map rendering
* **Native GPS Provider**: `react-native-geolocation-service` (`v5.3.1`) leveraging Google Fused Location Provider API
* **Real-time WebSockets**: `socket.io-client` (`v4.8.3`) for sub-second location coordinate streaming
* **Local Session Storage**: `@react-native-async-storage/async-storage` (`v3.1.1`)
* **Authentication**: `@react-native-google-signin/google-signin` (`v16.1.2`) for OAuth 2.0 social login

### Backend (`backend/package.json`)
* **Runtime & API Framework**: Node.js + Express framework (Port `5001`)
* **Database & ORM**: PostgreSQL with Sequelize ORM (`models/User.js`, `models/Device.js`, `models/TrustedContact.js`, `models/LocationLog.js`, `models/Alert.js`, `models/SafeZone.js`)
* **Real-time Socket Engine**: Socket.IO server (`io.on('connection')`) handling real-time rooms
* **API Documentation**: Swagger UI (`swagger-ui-express`) at `http://localhost:5001/api-docs`

---

## 3. Implemented Modules & Current System Status

### ✅ Module 1: Authentication & Device Authorization
* JWT Bearer token authentication with password hashing (`bcryptjs`).
* OAuth 2.0 Google Sign-In registration & login flow.
* Device binding workflow (`POST /api/device/bind`) capturing IMEI, model, and OS specs.
* 6-Digit cryptographically secure access code generation for trusted circle trackers.

### ✅ Module 2: Real-Time Geolocation & Maplibre Vector Engine
* High-accuracy GPS location tracking via `locationService.ts` (`Geolocation.watchPosition`, 3-5s interval, 5m movement threshold).
* Socket.IO streaming pipeline: `socket.emit('location_update')` -> backend broadcasts `location-broadcast` to `device-${deviceId}` room -> asynchronously logs to PostgreSQL `LocationLog` table.
* Historical route polyline visualization rendered directly over MapLibre dark & street basemaps.

### ✅ Module 3: Immersive Google Maps-Style Interface
* 100% full edge-to-edge satellite map mode (`isFullScreen={true}`).
* Floating top header bar with prominent **`← Back`** button to return to home dashboard and target title box.
* Google Maps-style bottom floating card sheet featuring real-time coordinates, GPS accuracy (`±5m`), live pulse dot, and action buttons (`🎯 Recenter`, `🌙/☀️ Basemap`, `📥 Offline Pack`, `📷 AR Vision`).

### ✅ Module 4: Visual Augmented Reality (AR) Final-Approach View
* Triggered when tracker is near the target (`< 15 meters`) or via **`📷 AR Vision`** tap.
* Real-time camera viewfinder feed overlay ([ARViewComponent.tsx](file:///Users/nuwangi/Desktop/research/safe-circle/frontend/src/components/ARViewComponent.tsx)).
* Trigonometric compass bearing engine ([distance.ts](file:///Users/nuwangi/Desktop/research/safe-circle/frontend/src/utils/distance.ts)): `calculateBearingDegrees` and `calculateDistanceMeters` compute target bearing and rotate a 3D HUD arrow toward the physical phone coordinates.
* Proximity reticle, distance gauge (`4.2m away`), and signal strength bar.

### ✅ Module 5: Safe Zones (Geofencing System)
* Database Model ([SafeZone.js](file:///Users/nuwangi/Desktop/research/safe-circle/backend/models/SafeZone.js)): Stores safe zone boundaries (`userId`, `zoneName`, `latitude`, `longitude`, `radiusMeters`, `isActive`).
* API Routes ([safeZoneRoutes.js](file:///Users/nuwangi/Desktop/research/safe-circle/backend/routes/safeZoneRoutes.js)): `POST /api/geofence`, `GET /api/geofence`, `DELETE /api/geofence/:id`.
* Map Rendering ([MapViewComponent.tsx](file:///Users/nuwangi/Desktop/research/safe-circle/frontend/src/components/MapViewComponent.tsx)): Dynamically draws semi-transparent green fill (`safezones-fill`) and dotted line (`safezones-outline`) GeoJSON circle polygons.
* Backend Geofence Evaluator ([server.js](file:///Users/nuwangi/Desktop/research/safe-circle/backend/server.js)): Socket.IO `location_update` calculates distance to active safe zones; broadcasts `geofence-breach` alerts if device exits boundary.

### ✅ Module 6: Remote Audio Alert & Ambient Audio Recorder
* Silent-mode audio override utilizing `STREAM_ALARM` audio channel.
* Ambient audio clip recording and upload (`POST /api/contacts/shared/alerts/:alertId/audio`) during emergency SOS alerts.

---

## 4. Key File Architecture Reference

```
safe-circle/
├── backend/
│   ├── config/db.js                 # PostgreSQL Sequelize database connection
│   ├── controllers/
│   │   ├── authController.js        # User auth & Google Sign-In logic
│   │   ├── deviceController.js      # Device registration & binding
│   │   ├── contactController.js     # Trusted contacts & access code generation
│   │   ├── locationController.js    # Location log database retrieval
│   │   ├── alertController.js       # Emergency SOS alert creation & resolution
│   │   └── safeZoneController.js    # Safe Zone (Geofence) CRUD operations
│   ├── models/                      # Sequelize models (User, Device, Contact, Log, Alert, SafeZone)
│   ├── routes/                      # Express route endpoints (/api/auth, /api/device, etc.)
│   └── server.js                    # Express app, Socket.IO WebSockets, Geofence breach evaluator
│
└── frontend/
    ├── App.tsx                      # Root navigation controller, Socket.IO client, global session state
    ├── src/
    │   ├── components/
    │   │   ├── MapViewComponent.tsx # Satellite map, GeoJSON polylines/circles, Google Maps overlays
    │   │   ├── ARViewComponent.tsx  # 3D camera HUD, compass bearing pointer arrow, proximity reticle
    │   │   ├── DeviceCard.tsx       # Bound device card item
    │   │   ├── ContactCard.tsx      # Trusted contact item
    │   │   └── FeedbackBanner.tsx   # Top banner notification toast
    │   ├── screens/
    │   │   ├── DashboardScreen.tsx  # Home dashboard, SOS trigger, Safe Zones management card
    │   │   ├── TrackerDashboardScreen.tsx # Remote contact tracking dashboard
    │   │   ├── WelcomeScreen.tsx    # Auth entry screen
    │   │   ├── SignUpScreen.tsx     # Local registration form
    │   │   ├── BindDeviceScreen.tsx # Device binding form
    │   │   ├── AddContactScreen.tsx # Trusted contact creation form
    │   │   └── TrackerAuthScreen.tsx# Access code entry for remote trackers
    │   ├── services/
    │   │   ├── api.ts               # HTTP client methods for backend API
    │   │   ├── locationService.ts   # Fused Location Provider API & watchPosition manager
    │   │   ├── audioService.ts      # Audio alarm player & recording manager
    │   │   └── offlineMapService.ts # MapLibre offline tile pack downloader
    │   └── utils/
    │       └── distance.ts          # Haversine distance & compass bearing math
```

---

## 5. Development & Execution Cheat Sheet

### 1. ADB Network Reverse Rules (Required for Android Emulator)
Whenever starting or restarting Metro bundler / Android emulator:
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5001 tcp:5001
```

### 2. Injecting Simulated GPS Coordinates to Emulator
```bash
adb emu geo fix -122.4194 37.7749
```

### 3. Starting the Backend Server
```bash
cd backend
npm start
# Server runs on http://localhost:5001 (Swagger docs at http://localhost:5001/api-docs)
```

### 4. Running the Frontend Application
```bash
cd frontend
npm run android
```

---

## 6. Next Recommended Development Tasks

1. **Motion Sensor Theft Detection Module**: Implement accelerometer and gyroscope gesture monitoring to detect sudden device displacement or handling anomalies.
2. **Smooth Marker Path Interpolation**: Animate map marker pin transitions smoothly between coordinate updates over 2-3 seconds.
3. **Multi-Device Map Overview**: Render multiple registered devices simultaneously on a single map bounds.
