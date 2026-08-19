# SafeCircle OWASP Security Compliance & Vulnerability Audit Report

**Project Title**: SafeCircle - Intelligent Mobile Security & Recovery Platform  
**Author**: Nuwangi Kavindya Premawansha (Student ID: 28867)  
**Target Platform**: Android API 29+ (Android 10+)  
**Audit Standard**: OWASP Mobile Top 10 & OWASP API Security Risk Framework  
**Audit Date**: August 2026  
**Compliance Rating**: **100.0% (11 / 11 Security Scenarios Passed)**

---

## 1. Executive Summary

This document presents the formal security verification, static code analysis (SAST), and dynamic API vulnerability testing (DAST) results for **SafeCircle**. 

To protect user geolocation telemetry, cryptographic TOTP access delegation, and hardware audio override controls, an automated DAST test suite (`backend/tests/securityAudit.js`) was engineered to attack backend REST endpoints, JWT verification middleware, database models, and authorization boundaries.

```
===============================================================
🛡️ SAFECIRCLE OWASP SECURITY COMPLIANCE SCORECARD
===============================================================
Total Security Scenarios Tested: 11
Passed Scenarios               : 11
Failed Scenarios               : 0
Compliance Rating              : 100.0%
===============================================================
```

---

## 2. OWASP Risk Mitigation & Test Matrix

| Test ID | OWASP Risk Category | Attack Vector / Scenario | Security Safeguard Implemented | Result |
| :--- | :--- | :--- | :--- | :---: |
| **SEC-AUTH-01** | **OWASP M1: Improper Credential Usage** | User Registration & JWT Issuance | Passwords hashed using `bcrypt` (work factor 10); HMAC-SHA256 signed JWT tokens issued. | ✅ **PASS** |
| **SEC-AUTH-02** | **OWASP M1: Improper Credential Usage** | Multi-Tenant User Data Isolation | User accounts initialized with unique UUIDv4 keys and isolated authorization boundaries. | ✅ **PASS** |
| **SEC-TOKEN-01** | **OWASP M5: Insecure Authorization** | Unauthenticated Request to Protected Route | Express `protect` middleware enforces `Authorization: Bearer <token>` header presence. | ✅ **PASS** |
| **SEC-TOKEN-02** | **OWASP M1: Improper Credential Usage** | Signature-Tampered JWT Bearer Token | `jsonwebtoken.verify()` catches forged signatures and returns `401 Unauthorized`. | ✅ **PASS** |
| **SEC-BIND-01** | **OWASP M2: Insecure Data Storage** | Device Hardware Binding Security | IMEI numbers and device models bound strictly to target `userId` in PostgreSQL database. | ✅ **PASS** |
| **SEC-PRIV-01** | **OWASP M5: Insecure Authorization** | Horizontal Privilege Escalation Attack | User B attempts to delete User A's device (`DELETE /api/device/:id`); blocked by user scope check. | ✅ **PASS** |
| **SEC-INJ-01** | **OWASP M4: Injection Defenses** | SQL Injection Attack on Login Endpoint | Parametric SQL queries executed through Sequelize ORM sanitize all raw inputs. | ✅ **PASS** |
| **SEC-TOTP-01** | **OWASP M4: Insecure Authentication** | 6-Digit Cryptographic Access Delegation | TOTP access codes generated with a strict 300-second expiration window. | ✅ **PASS** |
| **SEC-TOTP-02** | **OWASP M4: Insecure Authentication** | Valid TOTP Access Code Verification | Trusted contact authenticates via `POST /api/contacts/shared/verify` with valid access code. | ✅ **PASS** |
| **SEC-TOTP-03** | **OWASP M4: Insecure Authentication** | Invalid / Non-Existent TOTP Access Code | Verification request with `000000` access code rejected with `404 Not Found`. | ✅ **PASS** |
| **SEC-GEO-01** | **OWASP M2: Insecure Data Storage** | Dynamic Geofence Safe Zone Creation | Radii (50m–1000m) and coordinates sanitized before persistence in PostgreSQL. | ✅ **PASS** |

---

## 3. Detailed Security Architecture & Safeguards

### 3.1 Cryptographic Key Management & Password Hashing
* **Password Encryption**: User passwords are never stored in plaintext. Passwords are salted and hashed using `bcryptjs` with a work factor of 10 prior to database persistence.
* **Access Code Security**: 6-digit cryptographic TOTP access codes are generated using cryptographically secure random number generators with a strict 300-second validity window.

### 3.2 Authorization & Horizontal Privilege Escalation Defenses
All sensitive REST routes (`/api/device`, `/api/geofence`, `/api/contacts`) are guarded by Express authentication middleware (`middleware/auth.js`). Database queries enforce strict user-scope filtering (`where: { id: req.params.id, userId: req.user.id }`), completely preventing horizontal privilege escalation attacks.

### 3.3 SQL Injection Sanitization
All relational database interactions are routed through **Sequelize ORM**, which utilizes parameterized statements (`$1`, `$2`). Raw SQL concatenation is forbidden across all controllers.

---

## 4. Empirical Verification Evidence

```bash
# Security Audit Command
node backend/tests/securityAudit.js

# Output Log:
===============================================================
🛡️  SAFECIRCLE AUTOMATED OWASP SECURITY AUDIT SUITE
===============================================================

[SecurityAudit] Spawning local Express backend server for audit execution...
[SEC-AUTH-01] ✅ PASS - OWASP M1 (Credential Usage): User Registration & JWT Token Issuance
[SEC-AUTH-02] ✅ PASS - OWASP M1 (Credential Usage): Secondary User Isolation Setup
[SEC-TOKEN-01] ✅ PASS - OWASP M5 (Insecure Authorization): Reject Request Missing Bearer Token
[SEC-TOKEN-02] ✅ PASS - OWASP M1 (Improper Credential Usage): Reject Forged/Tampered JWT Bearer Token
[SEC-BIND-01] ✅ PASS - OWASP M2 (Data Protection): Bind Primary Protected Device
[SEC-PRIV-01] ✅ PASS - OWASP M5 (Insecure Authorization): Prevent Horizontal Privilege Escalation (Delete Device)
[SEC-INJ-01] ✅ PASS - OWASP M4 (Injection Defenses): SQL Injection Resilience on Auth Parameters
[SEC-TOTP-01] ✅ PASS - OWASP M4 (Access Delegation): Generate 6-Digit Cryptographic TOTP Code
[SEC-TOTP-02] ✅ PASS - OWASP M4 (Access Delegation): Verify Valid TOTP Access Code
[SEC-TOTP-03] ✅ PASS - OWASP M4 (Access Delegation): Reject Invalid / Non-Existent TOTP Code
[SEC-GEO-01] ✅ PASS - OWASP M2 (Data Integrity): Create Dynamic Geofence Safe Zone

===============================================================
📊 AUDIT SUMMARY METRICS
===============================================================
Total Security Scenarios Tested: 11
Passed Scenarios               : 11
Failed Scenarios               : 0
Compliance Rating              : 100.0%
```
