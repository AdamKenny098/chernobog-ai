# Chernobog 3D-10E1 — Natural Conversation

## Purpose

3D-10E1 removes the manual `LISTEN → STOP` requirement for normal voice turns while keeping push-to-talk available.

The phase adds a local adaptive voice activity detector to the browser sensory edge. It does not add another AI model and does not bypass Chernobog's existing command pipeline.

## Hands-Free Turn Flow

```text
CONVERSE
  ↓
Microphone opens
  ↓
Adaptive VAD calibrates to local noise
  ↓
User speech detected
  ↓
~1 second silence detected
  ↓
Recording closes automatically
  ↓
Whisper transcription
  ↓
Existing /api/chat Chernobog pipeline
  ↓
Piper speech when Voice is enabled
  ↓
Turn automatically re-arms
```

## Safety and Control

- Hands-free mode is explicitly enabled with `CONVERSE`.
- `END CHAT` stops the continuous session.
- 20 seconds with no detected speech ends the session automatically.
- A single utterance is capped at 45 seconds.
- Image/camera actions are disabled while hands-free conversation is active.
- Provider status is refreshed every 10 seconds during hands-free mode.
- If Whisper disappears, the hands-free session stops instead of pretending to listen.
- Existing manual `LISTEN` remains available when hands-free mode is off.
- Existing manual barge-in remains authoritative: starting a listening turn while TTS is playing interrupts playback.

## VAD

The VAD is local and dependency-free. It uses microphone RMS energy with:

- adaptive noise-floor tracking
- hysteresis between speech attack and silence release
- short speech-onset confirmation
- silence-based end-of-turn detection
- no-speech timeout
- maximum utterance timeout

This is deliberately provider-independent. A later 3D-10E2 phase may replace or augment the gate with Silero VAD for stronger noisy-room performance without changing the sensory contract.

## Event Spine

New client sensory events:

```text
sensory.vad.speech_started
sensory.vad.silence_detected
sensory.vad.timeout
sensory.conversation.started
sensory.conversation.turn_rearmed
sensory.conversation.stopped
```

They continue through the existing sensory event route and remain marked sensitive by the Sensory Spine publisher.

## Acceptance

Structural acceptance requires:

```text
npm run typecheck
npx tsx scripts/verify-chernobog-3d10-sensory-presence.ts
npx tsx scripts/verify-chernobog-3d10e-natural-conversation.ts
```

Live acceptance:

1. STT and TTS show ONLINE.
2. Click `CONVERSE` once.
3. The core enters Listening.
4. Speak a normal command and stop speaking naturally.
5. The turn closes without pressing STOP.
6. Chernobog transcribes, executes, replies, and speaks.
7. After speech playback completes, the core returns to Listening automatically.
8. A second spoken command works without another click.
9. `END CHAT` returns the system to manual mode.

## Deferred to 3D-10E2

- automatic spoken barge-in while Piper is already talking
- wake-word/summon detection
- long-lived ambient microphone sessions
- Silero VAD upgrade if the energy gate is not robust enough in the user's environment
