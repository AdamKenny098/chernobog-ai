# Chernobog 3D-10 — Sensory Presence

## Scope

This package adds the first complete sensory-presence foundation:

- push-to-talk microphone capture
- local WAV recording and 16 kHz resampling
- whisper.cpp speech-to-text adapter
- voice transcript routed through the existing `/api/chat` command pipeline
- Piper text-to-speech adapter
- interruptible audio playback / barge-in
- existing 3D `listening`, `thinking`, `speaking`, `success`, and `failure` states
- Event Spine sensory events
- explicit sensitive-event metadata
- camera capability discovery
- one-frame camera capture when hardware exists
- image-upload vision
- built-in generated vision self-test
- Ollama multimodal vision adapter
- clean no-webcam state

A missing webcam is an expected state, not an error.

## Architectural rule

Voice and vision are modalities, not separate brains.

```text
microphone -> STT -> existing Chernobog command pipeline -> reply -> TTS
camera/image -> vision observation -> sensory surface / future context binding
```

The microphone path deliberately submits the recognized transcript through
the same `/api/chat` command endpoint used by normal Chernobog interaction.

## Provider defaults

```text
STT      whisper.cpp    http://127.0.0.1:8080
TTS      Piper          http://127.0.0.1:5000
Vision   Ollama         http://127.0.0.1:11434
Model                    gemma3:latest
```

Override with:

```text
CHERNOBOG_STT_URL
CHERNOBOG_TTS_URL
CHERNOBOG_OLLAMA_URL
CHERNOBOG_VISION_MODEL
CHERNOBOG_SENSORY_TIMEOUT_MS
CHERNOBOG_SENSORY_MAX_AUDIO_BYTES
CHERNOBOG_SENSORY_MAX_IMAGE_BYTES
CHERNOBOG_SENSORY_MAX_SPEECH_CHARACTERS
```

## No-webcam operation

When no `videoinput` device exists, the Sensory deck displays:

```text
CAMERA: UNAVAILABLE
CAMERA HARDWARE ABSENT — vision pipeline remains available through IMAGE and SELF TEST.
```

The rest of Chernobog remains fully functional.

Use **IMAGE** to submit an existing image or **SELF TEST** to generate a deterministic
test card containing an orange triangle and the number 42.

## Local service setup

### Piper

Install Piper's HTTP server according to the current Piper documentation and
run it on port `5000`, or point `CHERNOBOG_TTS_URL` at the service you choose.

The Chernobog adapter expects:

```http
POST /synthesize
Content-Type: application/json

{"text":"..."}
```

and an audio response.

### whisper.cpp

Run whisper.cpp's HTTP server on port `8080`, or point
`CHERNOBOG_STT_URL` at another compatible instance.

The Chernobog adapter sends:

```http
POST /inference
multipart/form-data

file=<16 kHz mono PCM WAV>
response_format=json
```

and expects a JSON result containing `text`.

### Ollama vision

Chernobog posts to:

```http
POST /api/chat
```

with the selected vision model and a base64 image in the user message.

`CHERNOBOG_VISION_MODEL` defaults to `gemma3:latest`.

## Trust and privacy

- microphone capture only begins after an explicit user click
- camera capture only begins after an explicit user click
- camera capture is a single transient frame in this phase
- raw camera frames are not written into the Event Spine
- raw microphone audio is not written into the Event Spine
- sensory events are marked `sensitive: true`
- Event Spine payloads retain metadata (sizes, duration, provider) rather than raw media
- voice output starts only when **VOICE ON** is enabled
- speaking can be interrupted manually or by starting a new listening turn

## Secure-context requirement

Browser microphone/camera APIs require a secure context. Use localhost during
development or Chernobog's HTTPS route when accessing it remotely.

## Acceptance without webcam

1. Apply the patch.
2. `npm run typecheck` passes.
3. `npx tsx scripts/verify-chernobog-3d10-sensory-presence.ts` passes.
4. Command Center renders the Sensory deck.
5. Camera reports `UNAVAILABLE` if no webcam is attached.
6. IMAGE and SELF TEST remain available.
7. Once whisper.cpp is online, LISTEN sends the transcript through `/api/chat`.
8. Once Piper is online and VOICE ON is enabled, responses play aloud.
9. Starting LISTEN while audio is playing interrupts speech and enters `listening`.
10. Once a multimodal Ollama model is online, SELF TEST confirms the vision route.

## Deliberately deferred to 3D-10E

The architecture is ready for these, but they are intentionally not enabled by default:

- continuous ambient microphone listening
- wake-word detection
- continuous camera observation
- passive environment recording
- automatic memory writes from sensory data

Those require a separate explicit trust/ambient-mode acceptance step.
