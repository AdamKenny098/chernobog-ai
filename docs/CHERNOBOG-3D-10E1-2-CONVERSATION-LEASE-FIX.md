# Chernobog 3D-10E1.2.1 — Conversation Lease Fix

## Purpose

3D-10E1.1 improved post-response microphone re-arming, but live acceptance showed that CONVERSE could still collapse back to MANUAL after Chernobog completed a spoken response.

3D-10E1.2 makes the hands-free session user-owned.

## Locked behavior

Once the user presses `CONVERSE`:

- the control must remain `END CHAT` across spoken responses;
- post-response microphone re-arm must self-heal;
- quiet/no-speech windows must not end the session;
- STT health misses must wait/retry rather than end the session;
- TTS playback failure must not release the session;
- recorder/microphone re-arm races must wait/retry rather than release the session;
- a React component remount inside Command Center must retain the active conversation lease;
- `END CHAT` remains usable even if STT temporarily goes offline;
- only the explicit `END CHAT` path may release the active conversation lease during normal runtime.

The lease is deliberately module-lifetime only. It survives a React component remount but does not intentionally auto-start after a full browser/module reload.


## E1.2.1 compatibility correction

The E1.2 runtime behavior is unchanged. This revision restores the literal E1.1 regression marker `quiet periods automatically re-arm listening`, which the legacy verifier uses as a static acceptance sentinel.
