# Chernobog PA-2D3 — Heartbeat, Device Health & Reconnect Resilience

PA-2D3 makes the accepted Android companion a persistent mobile node.

## Runtime path

```text
Android process start
      ↓
register app visibility tracker
register default-network callback
      ↓
periodic WorkManager heartbeat (15 min minimum)
      +
immediate heartbeat when connectivity returns
      ↓
collect live device health
      ↓
POST /api/personal-assistance/mobile/heartbeat
      ↓
PA-2B authoritative lastSeenAt/current health
```

When connectivity returns, the same callback also asks the PA-2D2 notification spool to reconcile and upload immediately.

## Health fields

PA-2D3 reports the existing PA-2B contract:

- battery percentage
- charging state
- Android power-save mode
- network type: wifi / cellular / ethernet / offline / unknown
- app state: foreground / background
- notification-listener enabled
- local notification spool count
- client observation timestamp

## Reliability

The heartbeat worker uses a durable heartbeat lease ID stored locally.

The ID is retained across WorkManager retries and cleared only after a server-accepted response. This means a response-lost retry reuses the same PA-2B heartbeat identifier instead of creating duplicate health records.

Periodic work uses Android WorkManager's 15-minute minimum repeat interval and requires network connectivity.

An immediate one-time heartbeat is also scheduled:

- after an authenticated session refresh,
- when an enrolled companion process starts,
- when Android reports connectivity becoming available,
- when the user presses `HEARTBEAT + SYNC NOW`.

## Reconnect

```text
offline
  ↓
notifications keep spooling locally
  ↓
network becomes available
  ↓
ConnectivityManager callback
  ├─ enqueue heartbeat
  └─ enqueue notification reconciliation/upload
```

If the app process is not resident, WorkManager still retains periodic and pending constrained work across process death and device reboot.

## Safety boundary

PA-2D3 adds:

```text
android.permission.ACCESS_NETWORK_STATE
```

It does not add:

- location
- contacts
- SMS
- call log
- accessibility
- tool execution
- permission granting

Server-side PA-2B remains authoritative for health state, retention and device revocation.
