# Chernobog 3D-10E3 — Wake / Summon Mode

## Purpose

3D-10E3 adds an explicitly armed dormant listening mode to the accepted sensory stack.

Wake mode is not a permanent conversation. It is a user-owned sensory lease that waits for the local wake phrase before handing control to the existing CONVERSE session.

## Wake phrase

Primary phrase:

```text
Chernobog
```

The first implementation also tolerates the close Whisper spelling `Chernabog` and the natural prefixes `Hey`, `OK`, and `Okay`.

This is intentionally narrow. Wake detection should prefer a missed wake over broad fuzzy matching that activates from unrelated speech.

## Runtime flow

```text
ARM WAKE
  ↓
DORMANT / WAKE ARMED
  ↓
local microphone + adaptive VAD
  ↓
speech segment closes
  ↓
local whisper.cpp transcription
  ↓
non-match ───────────────→ discard + re-arm WAKE
  ↓ match
WAKE DETECTED
  ↓
transfer microphone ownership to CONVERSE
  ↓
Chernobog listens for the next turn
```

The wake phrase and command may also be spoken in one utterance:

```text
Chernobog, show system status.
```

In that case the wake prefix is removed and only the remainder is submitted to Chernobog's normal command pipeline.

## Privacy boundary

Before wake acceptance:

- VAD runs in the browser.
- Completed speech segments are sent only through Chernobog's local STT route to whisper.cpp.
- Rejected wake speech does not call `/api/chat`.
- Raw audio is not added to the Event Spine.
- Transcript text is not added to the Event Spine; the existing STT event records only metadata such as character count and duration.
- The UI visibly reports `DORMANT` and `WAKE ARMED` while the microphone is owned by wake mode.
- `WAKE OFF` explicitly releases the wake microphone lease.

Wake mode is one-shot in E3. A successful summon transfers into CONVERSE and turns WAKE off. After `END CHAT`, the user may explicitly arm WAKE again. Automatic return to ambient wake after a conversation is deliberately not enabled in this phase.

## Local detection strategy

E3 does not add another cloud or AI service.

It reuses the accepted stack:

```text
Browser microphone
  ↓
AdaptiveVoiceActivityGate
  ↓
WavRecorder (16 kHz WAV)
  ↓
/api/sensory/transcribe
  ↓
whisper.cpp
```

Whisper is invoked only after VAD detects a completed speech segment. Silent periods do not continuously invoke STT.

## Event Spine additions

```text
sensory.wake.armed
sensory.wake.speech_detected
sensory.wake.detected
sensory.wake.rejected
sensory.wake.failed
sensory.wake.stopped
```

All continue through the existing sensory event publisher and therefore remain marked sensitive.

## Interaction with existing phases

E3 preserves:

- 3D-10A Sensory Spine
- 3D-10B live listening
- 3D-10C live TTS
- 3D-10D vision
- 3D-10E1 natural conversation
- E1.1 re-arm behavior
- E1.2 conversation lease ownership
- 3D-10E2 anti-echo live barge-in

Wake mode and CONVERSE never own the microphone simultaneously.

## Live acceptance

### Test A — rejection boundary

1. Click `ARM WAKE`.
2. Confirm button becomes `WAKE OFF` and MODE becomes `DORMANT`.
3. Say an unrelated sentence without the Chernobog wake phrase.
4. Chernobog must not answer or execute it.
5. WAKE must remain armed.

### Test B — summon

1. While still armed, say `Chernobog`.
2. WAKE must release.
3. `CONVERSE` must become `END CHAT`.
4. Chernobog must enter normal listening and accept the next spoken command.

### Test C — inline summon command

1. End the conversation and arm WAKE again.
2. Say `Chernobog, show system status.`
3. The wake prefix must not be submitted as part of the command.
4. Chernobog must execute `show system status`, speak the answer when TTS is online, and remain in the accepted CONVERSE session afterward.

## Completion condition

3D-10E3 is accepted when unrelated speech is rejected before the command pipeline, the wake phrase reliably transfers dormant microphone ownership into CONVERSE, and a same-utterance wake + command works without weakening the existing conversation/barge-in behavior.
