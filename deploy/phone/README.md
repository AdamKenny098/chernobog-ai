# Private phone conversation

Native companion 0.5 supports `POST /api/chat` with `stream: true` for
newline-delimited JSON: `token` events carry `text`, followed by `done` with
the complete `reply` and `sessionId`. Failures after headers emit `error`.
The default request remains a single JSON response for older clients.
Disconnected streams abort the upstream model request; incomplete replies
are not committed to conversation storage. Install all three phone modules
(`phone-core.mjs`, `phone-interface.mjs`, `phone-stream.mjs`) together.

Current installations also require `phone-inference-router.mjs` and
`phone-personality.mjs`; both installers copy these automatically. Conversation
style is shared by the Acer core and desktop default-role gateway, with warmer
spoken phrasing and explicit limits on unsupported action claims.

This standalone Node 22 service provides authenticated conversation with the
existing Ollama model, without Next.js. It binds only to 127.0.0.1:3192.
Tailscale Serve provides private HTTPS on port 10443. Do not use Funnel or
forward this port through the router. Tailnet access policy must restrict
the server to trusted devices. The access token is kept only in the page's
memory; reload requires entering it again.

On Ubuntu, from a checkout of master:

```bash
sudo bash deploy/phone/install.sh
```

Connect the phone to Tailscale, open the HTTPS URL printed by the installer,
enter the printed token, and select Open Command Center. This serves the
actual existing Command Center from the running Next.js frontend on port
3000, including its existing appearance and microphone controls. It is a
frontend bridge, not a port or rebuilt copy of the React interface. The
frontend must remain running; chat and model inference still run separately.
The login uses a Secure, HttpOnly, SameSite=Strict cookie lasting 12 hours.
Chat and speech endpoints run in the current service; personal-assistance
panels can read existing legacy status, but their mutation endpoints and
unrelated navigation routes are not exposed by this bridge.

Install server-local voice processing after the phone service exists:

```bash
sudo bash deploy/phone/install-voice.sh
node scripts/verify-phone-voice.mjs
```

Docker must already be installed. The installer builds a Python 3.12 speech
image with faster-whisper 1.2.1, Piper 1.3.0 and PyAV 15.1.0 (newer PyAV 19
removed an API used by this faster-whisper release). Models are downloaded
at image-build time; inference uses offline files. The service listens only
on 127.0.0.1:3194. It uses CPU transcription and the en_US-lessac-medium voice.
The Flask service uses Werkzeug's programmatic HTTP server on loopback.
Speech shares a single inference lock, rejects oversized uploads and limits
speech text to 8000 characters. Models are inside the container image and do
not require production vault access. First build requires Internet access.

On the Command Center, grant microphone access and enable its listening and
speech controls. Verify a spoken question receives an audible reply and
that turning listening off stops recording. The existing wake/listening
behavior is retained. Phone microphone permissions, autoplay and latency
must be checked on the actual device.

Speech implementation follows the upstream APIs:
- https://github.com/SYSTRAN/faster-whisper
- https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md
The model defaults to gemma3:4b. Change CHERNOBOG_PHONE_MODEL in
/etc/chernobog-phone.env and restart chernobog-phone if needed.

Conversation history persists in /var/lib/chernobog-phone, restricted to the
dedicated service identity. Only the latest 24 messages are supplied as context.
The page resumes its session ID after reload but does not render older turns.
Back up this directory if conversation retention is required. This runtime
does not execute tools, run scheduler jobs, or access the old vault and memory.
It must not claim that those B15 capabilities have been activated.

The B15 branch at 54896ac contains 177 commits not on master and master has
three commits not in B15. This release adds the conversation path to master
without merging the entire experimental deployment branch. B15 jobs.json and
legacy writer blockers still apply to activating B15 against shared storage.
This service uses a separate store and does not acquire shared writer authority.

Verification:

```bash
node --test tests/phoneCore.test.mjs
sudo systemctl status chernobog-phone --no-pager
sudo journalctl -u chernobog-phone -n 50 --no-pager
curl --fail http://127.0.0.1:3192/health/live
sudo systemctl restart chernobog-phone
tailscale serve status
```

The installer checks authenticated model readiness. A real conversation is
still required to verify inference, and a phone test is required to verify
end-to-end connectivity. Node is restarted after failure and enabled at boot.

Rollback only this service (existing services and Serve ports are untouched):

```bash
sudo tailscale serve --https=10443 off
sudo systemctl disable --now chernobog-phone
sudo systemctl disable --now chernobog-voice
```

Observed server: Node 22.22.1; Ollama gemma3:4b; legacy, passive core,
Village, agent host and Tailscale active. Serve ports 443 and 8443 were
already occupied; Docker Portainer also occupies 9443, so this installer
uses 10443. SSH works as omen; sudo
requires an interactive password. System service installation cannot be
completed by the remote noninteractive session.

Live verification on the Acer: Command Center HTML and stylesheet returned
200 through the new gateway; Piper produced WAV audio; faster-whisper
recognized the synthesized sentence; Gemma replied; Piper synthesized the
reply. Node integration checks cover authentication, secure cookie flags,
frontend assets, voice routing, blocked legacy mutations and cross-site
request rejection. Browser visual inspection was blocked by the testing
browser's inability to resolve the private Tailscale hostname.
