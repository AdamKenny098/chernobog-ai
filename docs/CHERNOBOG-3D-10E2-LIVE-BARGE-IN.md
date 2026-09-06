# Chernobog 3D-10E2 — Live Barge-In

## Purpose

3D-10E2 makes hands-free conversation interruptible while preserving the accepted E1.2 conversation lease.

When Chernobog begins TTS playback during CONVERSE, the browser opens a second microphone monitor with echo cancellation, noise suppression, and a dedicated adaptive VAD profile. The first 650 ms are an anti-echo calibration window used to learn residual speaker bleed. Sustained speech above that learned floor is treated as a user interruption.

## Interruption flow

```text
Chernobog speaking
  -> barge-in monitor calibrates against speaker echo
  -> monitor becomes ARMED
  -> user begins sustained speech
  -> barge-in detected
  -> recent 500 ms of microphone audio retained as pre-roll
  -> older TTS echo discarded from the recorder
  -> TTS playback interrupted
  -> same microphone stream promoted to the active user turn
  -> Chernobog core switches to LISTENING
  -> normal silence detection closes the interruption turn
  -> Whisper -> /api/chat -> Piper
  -> conversation continues under the same CONVERSE lease
```

## Truth and failure behavior

Barge-in is an enhancement, not a requirement for the conversation lease. If the browser cannot open the monitor while TTS is playing, Chernobog reports BARGE-IN `UNAVAILABLE`, finishes the current spoken response, and returns to normal hands-free listening afterward.

Only explicit `END CHAT` can release the conversation lease. Barge-in detection, monitor failure, TTS interruption, provider health checks, or silence do not own that authority.

## Echo strategy

E2 deliberately does not treat any microphone activity during playback as an interruption. It combines browser echo cancellation/noise suppression with a 650 ms adaptive calibration window and a sustained 260 ms speech-onset requirement.

This is intended to reduce Chernobog interrupting himself through speaker bleed. Actual acoustic behavior remains hardware- and room-dependent, so live acceptance is authoritative.

## Live acceptance

1. Start `CONVERSE`.
2. Ask a question that produces a response long enough to interrupt.
3. While Chernobog is speaking, say clearly: `Wait, stop. Tell me the time instead.`
4. Chernobog must stop speaking before finishing the old response.
5. The panel must show BARGE-IN moving through `CALIBRATE` / `ARMED` / `INTERRUPT` as appropriate.
6. The interruption must become the next transcribed user turn without another click.
7. Chernobog must answer the interruption and remain in `END CHAT` mode afterward.
8. Repeat once to make sure the monitor re-arms on later spoken replies.

## Deferred

Wake-word/summon behavior and always-on ambient listening are not part of E2.
