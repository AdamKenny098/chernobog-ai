# Chernobog 3D-10E3.4 — Voice Sleep Command

## Purpose

Add a deterministic spoken command that disables Chernobog sensory activity without touching the UI.

Canonical command:

```text
Chernobog, go to sleep.
```

The sensory layer recognizes the command locally after Whisper transcription and before `/api/chat`. The LLM therefore does not need to understand or approve the shutdown request.

## Accepted aliases

Exact command-style phrases include:

```text
go to sleep
sleep
go dormant
stop listening
stop listening to me
turn off listening
disable listening
sensory off
```

They may be prefixed with the Chernobog wake phrase. Matching is exact after normalization so ordinary sentences containing words such as "sleep" do not accidentally shut sensory mode down.

## Behavior during CONVERSE

```text
user speaks shutdown command
→ Whisper transcript
→ local sensory command matcher
→ no /api/chat dispatch
→ CONVERSE lease released
→ wake lease released if present
→ microphone recorder cancelled
→ barge-in monitor stopped
→ active TTS stopped
→ automatic voice disabled
→ core returns to idle
```

## Behavior during WAKE

`Chernobog, go to sleep` is detected after the wake phrase is recognized but before wake mode transfers ownership to CONVERSE. It therefore disarms the wake microphone instead of summoning the assistant.

## UI fallback

The explicit `SENSORY OFF` button remains as a manual safety fallback.
