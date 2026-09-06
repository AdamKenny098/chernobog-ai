# Chernobog 3D-10E1.1 — Conversation Re-arm Fix

## Problem

Live acceptance found that `CONVERSE` could finish Chernobog's spoken reply and then terminate instead of returning to the microphone for the next user turn.

## Corrected behavior

- `CONVERSE` remains active after Chernobog finishes speaking.
- A quiet 20-second VAD window no longer ends the entire session; it releases and re-arms the microphone.
- Microphone reacquisition after TTS is retried through transient browser/device races.
- Re-arm waits if the previous recorder is still shutting down.
- A single missed Whisper health poll no longer kills the conversation; three consecutive failures are required.
- Explicit `END CHAT`, fatal permission/device errors, and exhausted microphone retries can still end the session truthfully.

## Acceptance

Start `CONVERSE`, speak one command, allow Chernobog to finish his reply, then say a second command without clicking anything. The microphone must have returned to LISTENING and the second turn must execute.
