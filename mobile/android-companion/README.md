# Chernobog PA-2D1 — Android Companion Foundation

PA-2D1 starts the real phone-side Chernobog Mobile Companion.

This is not another server stub. It is a native Android application project that speaks to the already accepted PA-2A/PA-2B/PA-2C server APIs.

## Scope

PA-2D1 establishes:

- native Kotlin Android application
- Jetpack Compose Chernobog interface
- one-time PA-2A enrollment flow
- persistent random installation identity
- canonical server device identity
- Android Keystore-backed bearer-token encryption
- HTTPS-only endpoint enforcement
- authenticated `/mobile/session` validation
- current server capability display
- explicit refusal of unexpected mobile tool-execution / permission-grant capability
- Gradle wrapper bootstrap with pinned distribution checksum
- endpoint policy unit tests

PA-2D1 intentionally does **not** yet add the Android notification listener, offline notification database, WorkManager upload/reconciliation jobs, or heartbeat worker. Those are the next PA-2D slices.

## Project path

```text
mobile/android-companion/
```

The web/Next.js Chernobog application remains the server authority.

## Toolchain

Pinned foundation:

```text
Android Gradle Plugin  9.4.0
Gradle                 9.6.0
Kotlin                 2.3.21
compileSdk             37
targetSdk              36
minSdk                 28
Compose BOM            2026.08.00
Activity Compose       1.13.0
Lifecycle              2.10.0
Core KTX               1.18.0
JDK target             17
```

The Gradle wrapper bootstrap downloads only the official Gradle 9.6.0 binary distribution and verifies:

```text
SHA-256:
bbaeb2fef8710818cf0e261201dab964c572f92b942812df0c3620d62a529a01
```

before generating the standard wrapper.

## Security model

### Installation identity

The app generates a random UUID on first use.

It does **not** read or use:

- IMEI
- serial number
- advertising ID
- phone number
- hardware identifiers

### Device bearer

The PA-2A bearer token is returned by Chernobog once during enrollment.

On Android it is encrypted with:

```text
AndroidKeyStore
AES/GCM/NoPadding
256-bit AES key
```

The AES key remains in Android Keystore. The app-private preference file stores only the encrypted token payload.

### Network

The application manifest sets:

```xml
android:usesCleartextTraffic="false"
```

and `EndpointPolicy` rejects any endpoint that is not HTTPS.

The endpoint must be the Chernobog Tailnet HTTPS endpoint. PA-2B remains the server-side transport policy authority.

### Privilege boundary

PA-2D1 is identity/session only.

The application checks that the server does not expose:

```text
toolExecution = true
permissionGranting = true
```

to the mobile session.

## Enrollment

From Chernobog, create a one-time pairing challenge:

```http
POST /api/personal-assistance/mobile/enrollment
```

Enter the returned pairing code in the companion.

The app calls:

```http
POST /api/personal-assistance/mobile/enroll
```

and securely stores the returned mobile bearer.

On future launches it validates the bearer with:

```http
GET /api/personal-assistance/mobile/session
Authorization: Bearer <device-token>
```

## Android build

First create the standard Gradle wrapper:

```powershell
cd C:\Users\adamt\Documents\chernobog-ai\mobile\android-companion

powershell -ExecutionPolicy Bypass -File ".\scripts\bootstrap-gradle-wrapper.ps1"
```

Then build:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\build-debug.ps1"
```

Expected APK:

```text
mobile\android-companion\app\build\outputs\apk\debug\app-debug.apk
```

You can also open `mobile/android-companion` directly in Android Studio.

## Next slice

PA-2D2 will add the real Android sensor path:

```text
NotificationListenerService
        ↓
privacy-aware local normalization
        ↓
durable local spool
        ↓
network-aware WorkManager upload
        ↓
PA-2C acknowledgement / reconciliation
```
