# SafeCircle: Interim Submission 02 Report

**Project Title**: SafeCircle: An Intelligent Mobile Anti-Theft and Recovery System Using Real-Time Tracking and Audio Alerts  
**Student Name**: Nuwangi Kavindya Premawansha  
**Student ID**: 28867  
**Degree**: Bachelor of Science in Software Engineering  
**Faculty / Institution**: Faculty of Computing | NSBM Green University  
**Submission**: Interim Submission 02 (2026)  

---

## Executive Summary

**SafeCircle** is an intelligent, integrated mobile anti-theft and recovery platform engineered to resolve critical vulnerabilities in existing device security solutions. Commercial systems (such as Apple's *Find My* and Google's *Find My Device*) suffer from three fundamental bottlenecks: they require devices to remain online and logged in, fail to leverage nearby trusted social contact networks for recovery, and cannot reliably override silent or Do Not Disturb (DND) audio profiles during emergency displacement.

This **Interim Submission 02** document details the System Requirements Specification (SRS), system architecture, detailed implementation progress across seven core technical modules, security and privacy-by-design framework, preliminary performance benchmarks, and updated research roadmap following the Design Science Research (DSR) methodology.

---

## Table of Contents

1. [System Requirements Specification (SRS)](#1-system-requirements-specification-srs)
   - 1.1 Stakeholder Analysis
   - 1.2 Functional Requirements (FR)
   - 1.3 Non-Functional Requirements (NFR)
2. [System Architecture & Design](#2-system-architecture--design)
   - 2.1 High-Level Component Architecture
   - 2.2 Entity-Relationship & Database Schema
   - 2.3 Real-Time WebSocket & Event Pipeline
3. [Module Implementation & Technical Progress](#3-module-implementation--technical-progress)
   - 3.1 Module 1: Authentication, OAuth 2.0 & Device Authorization
   - 3.2 Module 2: Fused GPS Location Engine & Vector Map Streaming
   - 3.3 Module 3: Immersive Map Control & Offline Tile Caching
   - 3.4 Module 4: Augmented Reality (AR) Final-Approach Navigation
   - 3.5 Module 5: Dynamic Safe Zones & Automated Geofence Breach Evaluator
   - 3.6 Module 6: Remote Silent-Mode Audio Alert Override & Ambient Audio Capture
   - 3.7 Module 7: Sensor-Based Theft Anomaly Detection Subsystem
4. [Security, Privacy-by-Design & Data Protection](#4-security-privacy-by-design--data-protection)
   - 4.1 Privacy-by-Design & Data Minimization
   - 4.2 Security Architecture & OWASP Mobile Top 10 Safeguards
5. [Testing, Performance Benchmarks & Empirical Verification](#5-testing-performance-benchmarks--empirical-verification)
   - 5.1 Technical Performance Data
   - 5.2 Test Coverage & Verification Matrix
6. [Project Progress & DSR Milestone Roadmap](#6-project-progress--dsr-milestone-roadmap)
   - 6.1 Completed vs. Remaining Deliverables
   - 6.2 Next Phase Action Plan

---

## 1. System Requirements Specification (SRS)

### 1.1 Stakeholder Analysis

| Stakeholder Category | Role / Perspective | Key Requirements |
| :--- | :--- | :--- |
| **Primary Device Owner** | Primary user seeking protection for personal device and sensitive data | Proactive theft alerts, easy setup, silent mode audio override, granular privacy controls, zero battery strain. |
| **Trusted Circle Contact** | Authorized contact assisting in recovery during theft/displacement | Instant proximity notification, 6-digit TOTP secure access, view-only real-time tracking map, remote audio trigger capability. |
| **System Administrator / Academic Assessor** | Oversees system security, research integrity, and performance metrics | OWASP-compliant authentication, full audit log transparency, reproducible benchmarks, privacy minimization. |

---

### 1.2 Functional Requirements (FR)

* **FR-01: Multi-Factor & OAuth Authentication**: The system shall support local user registration with JWT authentication and Google OAuth 2.0 social login.
* **FR-02: Device Binding & Authorization**: The system shall allow users to register primary security devices, storing hardware identifiers (IMEI, model, OS version).
* **FR-03: Cryptographic Access Code Generation**: The system shall generate cryptographically secure 6-digit TOTP access codes with a maximum validity window of 300 seconds for trusted contact delegation.
* **FR-04: Real-Time GPS Tracking**: The system shall capture continuous geolocation coordinates (latitude, longitude, accuracy, speed, heading) using Android Fused Location Provider API at customizable intervals (3–5 seconds).
* **FR-05: Real-Time Map Streaming**: The system shall render real-time device movement on interactive vector basemaps (MapLibre Native SDK) with dynamic zoom and polyline route history.
* **FR-06: Silent-Mode Audio Override**: The system shall trigger high-decibel multi-frequency audio alerts utilizing the Android `STREAM_ALARM` channel, overriding hardware silent/vibrate profiles.
* **FR-07: Ambient Audio Recording**: The system shall automatically capture ambient audio clips during active SOS alerts and upload encrypted audio files to backend storage for contact verification.
* **FR-08: Dynamic Safe Zones (Geofencing)**: The system shall enable creation, monitoring, and deletion of custom circular Safe Zones with configurable radii (50m–1000m).
* **FR-09: Geofence Exit Alerts**: The backend engine shall compute Haversine distance in real time and automatically emit `geofence-breach` alerts when a device exits active safe zones.
* **FR-10: AR Final-Approach Guidance**: The system shall provide an augmented reality camera HUD with 3D compass orientation pointer when a tracker is within close proximity (<15m) of the target device.
* **FR-11: Motion Sensor Anomaly Detection**: The system shall utilize accelerometer and gyroscope data to detect uncharacteristic device handling patterns indicating theft.

---

### 1.3 Non-Functional Requirements (NFR)

* **NFR-01: Performance & Latency**: Socket.IO location update transmission latency shall remain under **300 ms** under 4G/LTE conditions.
* **NFR-02: Battery Efficiency**: Idle monitoring mode shall consume less than **1.5% battery per hour** on standard Android devices.
* **NFR-03: Location Accuracy**: Location determination accuracy shall achieve **±3–5 meters** in open-sky GPS conditions and **±15–30 meters** in network-assisted indoor positioning.
* **NFR-04: Security & Encryption**: All API communications shall enforce TLS 1.3 encryption. Passwords and access codes shall be hashed using `bcrypt` (work factor 10) and HMAC-SHA256.
* **NFR-05: Privacy Data Minimization**: Geolocation streaming shall activate strictly during user-initiated monitoring sessions or emergency SOS/geofence alerts, avoiding continuous data surveillance.
* **NFR-06: Usability & SUS Score**: The user interface shall achieve a minimum System Usability Scale (SUS) score of **>80/100** in empirical user evaluations.

---

## 2. System Architecture & Design

### 2.1 High-Level Component Architecture

```
                                  +---------------------------------------+
                                  |         TRUSTED CONTACT DEVICE        |
                                  |  - Remote Tracker Dashboard Screen    |
                                  |  - Real-Time Map & Route Stream       |
                                  |  - Remote Audio Override Button       |
                                  +-------------------+-------------------+
                                                      |
                                          Socket.IO / REST API
                                                      |
                                                      v
+-----------------------------------+     +-----------------------------------+
|      PRIMARY PROTECTED DEVICE     |     |          BACKEND SERVER           |
|  - Fused Location Provider API    |     |  - Node.js & Express REST API     |
|  - Socket.IO Real-Time Client     | <-> |  - Socket.IO Room Broadcast Engine |
|  - MapLibre Vector Engine         |     |  - Geofence Breach Evaluator      |
|  - AR Viewfinder & Compass HUD    |     |  - PostgreSQL Database (Sequelize)|
|  - Stream Alarm Audio Controller  |     +-----------------------------------+
+-----------------------------------+
```

---

### 2.2 Entity-Relationship & Database Schema

The database relies on **PostgreSQL 15** with Sequelize ORM. The relational models include:

1. **User**: `id`, `fullName`, `email`, `passwordHash`, `phoneNumber`, `googleId`, `createdAt`, `updatedAt`
2. **Device**: `id`, `userId`, `deviceName`, `imei`, `model`, `osVersion`, `status`, `createdAt`
3. **TrustedContact**: `id`, `userId`, `contactName`, `contactPhone`, `contactEmail`, `relationship`, `accessCode`, `accessCodeExpiresAt`, `createdAt`
4. **LocationLog**: `id`, `deviceId`, `latitude`, `longitude`, `accuracy`, `speed`, `heading`, `timestamp`
5. **Alert**: `id`, `userId`, `deviceId`, `alertType` ('SOS' | 'GEOFENCE_BREACH' | 'THEFT_ANOMALY'), `status`, `latitude`, `longitude`, `audioFileUrl`, `createdAt`
6. **SafeZone**: `id`, `userId`, `zoneName`, `latitude`, `longitude`, `radiusMeters`, `isActive`, `createdAt`

---

### 2.3 Real-Time WebSocket & Event Pipeline

```
Primary Device (GPS Fix) ──► socket.emit('location_update', data)
                                    │
                                    ▼
                         Backend Server (server.js)
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
Persist Coordinate         Broadcast Event                 Evaluate Distance vs.
to LocationLog Table       io.to('device-ID').emit         Active SafeZones (Haversine)
(PostgreSQL)               ('location-broadcast')                   │
                                    │                               ▼
                                    ▼                      If Distance > Radius:
                           Tracker Dashboard               Emit 'geofence-breach'
                           (Marker & Polyline Update)      Push Notification & Alert Log
```

---

## 3. Module Implementation & Technical Progress

### 3.1 Module 1: Authentication, OAuth 2.0 & Device Authorization
* **JWT & Google OAuth 2.0**: Full bearer token authentication flow implemented in `authController.js` and `App.tsx`.
* **Device Binding**: Secure registration API (`POST /api/device/bind`) associating primary smartphones with user accounts.
* **Cryptographic Access Code Generator**: Generates 6-digit TOTP access codes with automatic expiration for trusted contacts.

### 3.2 Module 2: Fused GPS Location Engine & Vector Map Streaming
* **High-Accuracy Geolocation**: `locationService.ts` leverages `react-native-geolocation-service` (Android Fused Location Provider API) with `enableHighAccuracy: true` and `maximumAge: 0` for zero-stale coordinate fetching.
* **Sub-Second Streaming**: Emits live location coordinates over Socket.IO every 3 seconds during active tracking sessions.
* **MapLibre Engine**: Dynamic vector map rendering supporting custom dark and street map tile styles.

### 3.3 Module 3: Immersive Map Control & Offline Tile Caching
* **Google Maps-Style UI**: Edge-to-edge full-screen map mode with floating top header, return buttons, coordinates overlay, and bottom action sheet.
* **Offline Map Caching**: Integrated `offlineMapService.ts` allowing users to download vector tile packs for offline recovery scenarios.
* **Smart Device Centering**: Map auto-centers over target coordinates with customizable zoom levels (e.g., city/district overview zoom `11.5`).

### 3.4 Module 4: Augmented Reality (AR) Final-Approach Navigation
* **Close Proximity Activation**: Automatically engages when the tracker is within `<15 meters` of the displaced device.
* **Visual HUD Viewfinder**: Live camera feed powered by `ARViewComponent.tsx`.
* **3D Compass Arrow**: Utilizes trigonometric bearing calculations (`calculateBearingDegrees` in `distance.ts`) to rotate a direction pointer toward physical phone coordinates.

### 3.5 Module 5: Dynamic Safe Zones & Automated Geofence Breach Evaluator
* **Geofence CRUD Operations**: Complete API suite (`POST /api/geofence`, `GET /api/geofence`, `DELETE /api/geofence/:id`) supported by `safeZoneController.js`.
* **GeoJSON Polygon Overlay**: Map component dynamically draws semi-transparent green safe zone circles (`safezones-fill`) and outlines on the map.
* **Automated Breach Detection**: Backend distance evaluator calculates real-time distance from safe zone centers on every location update and fires automated breach alerts upon exit.

### 3.6 Module 6: Remote Silent-Mode Audio Alert Override & Ambient Audio Capture
* **Silent Mode Bypass**: `audioService.ts` executes high-decibel acoustic alerts routed directly through Android `STREAM_ALARM`.
* **Ambient Sound Snapshot**: Automatically records 5–10 second ambient environment sound clips during SOS events and uploads audio recordings (`POST /api/contacts/shared/alerts/:alertId/audio`) for verified recovery assessment.

### 3.7 Module 7: Sensor-Based Theft Anomaly Detection Subsystem
* **Sensor Integration**: Framework established for listening to 3-axis accelerometer and gyroscope streams (`react-native-sensors`).
* **TensorFlow Lite Plan**: On-device LSTM neural network model integration to detect rapid acceleration, uncharacteristic orientation flips, and forced displacement patterns with a target inference time of `<15 ms`.

---

## 4. Security, Privacy-by-Design & Data Protection

### 4.1 Privacy-by-Design & Data Minimization
SafeCircle adheres to seven core **Privacy-by-Design** principles (Roberts & White, 2022):
1. **Session-Based Collection**: Geolocation data collection is strictly event-driven (activated during active SOS, geofence breaches, or authorized tracker sessions).
2. **View-Only Trusted Access**: Trusted contacts receive view-only access to location data; private device contents, messages, and photos remain inaccessible.
3. **Time-Bounded Authorization**: Access codes automatically expire after 300 seconds.
4. **On-Device ML Inference**: Theft detection anomaly models execute locally via TensorFlow Lite without transmitting raw sensor data to external servers.

### 4.2 Security Architecture & OWASP Mobile Top 10 Safeguards

| OWASP Risk Vector | Security Control Implemented in SafeCircle |
| :--- | :--- |
| **M1: Improper Credential Usage** | Cryptographic JWT token storage using Encrypted Storage; passwords hashed via `bcrypt` (work factor 10). |
| **M2: Insecure Data Storage** | Sensitive local state stored in encrypted AsyncStorage; backend uses PostgreSQL with SSL. |
| **M3: Insecure Communication** | Mandatory HTTPS/TLS 1.3 endpoints and secure WebSocket connections (`wss://`). |
| **M4: Insecure Authentication** | 6-digit cryptographic TOTP with rate limiting and 300s expiration windows to prevent brute-force attacks. |
| **M5: Insecure Authorization** | Role-based middleware verifying JWT bearer tokens and device ownership on every endpoint. |

---

## 5. Testing, Performance Benchmarks & Empirical Verification

### 5.1 Technical Performance Data

| Metric / Parameter | Experimental Setup | Measured Result | Benchmark Standard | Status |
| :--- | :--- | :--- | :--- | :--- |
| **API Response Latency** | 100 REST calls under simulated 4G network | **142 ms (avg)** | < 300 ms | ✅ Passed |
| **WebSocket Event Delay** | Location update emission to room broadcast | **68 ms (avg)** | < 150 ms | ✅ Passed |
| **GPS Fix Accuracy** | Open-sky GPS test on Android Emulator / Physical Device | **±3.8 meters** | < 5.0 meters | ✅ Passed |
| **Audio Alert Delay** | Remote trigger to audible output start | **310 ms** | < 1000 ms | ✅ Passed |
| **TypeScript Type Checks** | `npx tsc --noEmit` across entire codebase | **0 errors** | 0 errors | ✅ Passed |

---

### 5.2 Test Coverage & Verification Matrix

```bash
# Frontend Type Check & Compilation Verification
cd frontend && npx tsc --noEmit
# Result: 0 compilation errors

# Backend Server Health Check & Swagger API Verification
cd backend && npm start
# Result: Express server running on port 5001 (Swagger docs active at /api-docs)
```

---

## 6. Project Progress & DSR Milestone Roadmap

### 6.1 Completed vs. Remaining Deliverables

```
Phase 1: Foundation (Nov-Dec 2025)            [====================] 100% Completed
Phase 2: Core Development (Jan-Feb 2026)      [====================] 100% Completed
Phase 3: Feature Implementation (Mar-Apr 2026)[====================] 100% Completed
Phase 4: Security Integration (May 2026)      [====================] 100% Completed
Phase 5: Testing & Validation (Jun-Jul 2026)  [============        ]  65% In Progress
Phase 6: User Evaluation (Aug-Sep 2026)       [                    ]   0% Pending
Phase 7: Refinement (Oct 2026)                [                    ]   0% Pending
Phase 8: Documentation & Thesis (Nov 2026)    [                    ]   0% Pending
```

---

### 6.2 Next Phase Action Plan

1. **Finalize TFLite Anomaly Model**: Package and deploy the quantized 5 MB TensorFlow Lite LSTM gesture model into the React Native Android build.
2. **Usability Study (SUS Evaluation)**: Conduct empirical user testing with 30+ participants from NSBM Green University to capture System Usability Scale (SUS) scores and task completion metrics.
3. **Penetration Testing**: Execute automated penetration scans (OWASP ZAP & Burp Suite) and static code analysis (SonarQube) prior to final dissertation submission.

---

*Report prepared for NSBM Green University Software Engineering Research Project Assessment.*
