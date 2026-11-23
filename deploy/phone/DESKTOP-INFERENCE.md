# Desktop inference over Tailscale

Phone -> Acer phone core -> desktop restricted gateway -> desktop Ollama.
The Acer retains conversation files, speech processing and local Gemma fallback.
No companion APK or phone access token change is required.

The desktop gateway bundles the actual `packages/models/src/modelRouter.ts`
and `modelMatching.ts`; it does not copy their role-selection implementation.
Default roles remain default/code/planner/repair. Installed inventory is
matched against the existing role candidate order for every request. This
does not connect the legacy in-memory Model Control Center UI to the phone:
role overrides for this independent process are in its protected config file.
The current phone conversation uses the default role. Larger coding/planning
models are available by role but are not automatically used for casual voice.

Current desktop configuration uses qwen3.5:9b for default conversation,
deepseek-coder-v2:16b for code, gpt-oss:20b for planner, and qwen3-coder:30b
for repair. The latter models can exceed the desktop's 10 GB VRAM; choosing
those roles may cause CPU offload or slow model switching. Reasoning output
is disabled, context is 4096 tokens, and output is capped at 1024 tokens.

## Security and availability

- Ollama remains on loopback. The gateway binds to 127.0.0.1:11435.
- Tailscale Serve provides tailnet-only HTTPS at desktop port 11443.
- A separate random 32-byte inference credential authenticates all requests.
- Only GET /api/tags and POST /api/chat are exposed. Model-management methods
  are blocked; prompts cannot select arbitrary unregistered models.
- The Windows configuration directory is restricted to its owner and SYSTEM.
- The Acer staging credential has mode 0600 and is installed into a root-owned
  EnvironmentFile. The phone's credential is never forwarded to the desktop.
- A scheduled task runs at Windows user sign-in. Its hidden watchdog restarts
  the gateway after failure; the desktop must be awake and the user signed in.
- The default model warms at gateway startup, then is kept resident for ten
  minutes after use. Set warmOnStart=false in config to disable prewarming.

A 2.5-second inventory probe detects an unavailable desktop. If reachable,
the model has up to 15 seconds to start responding. Busy/retryable desktop
errors fall back to Acer before returning any generated text. Authentication
or configuration errors fail closed. After desktop response headers have
been accepted, stream failures are surfaced rather than replayed on another
model. Interrupted phone requests abort upstream generation.

## Build and checks

From the repository root, with existing esbuild installed:

```powershell
npx --no-install esbuild scripts/desktop-inference.mjs --bundle --platform=node --format=esm --target=node22 --tsconfig=tsconfig.json --outfile=../desktop-inference.bundle.mjs
node --test tests/desktopInference.test.mjs tests/phoneInferenceRouter.test.mjs tests/phoneCore.test.mjs tests/phoneInterface.test.mjs tests/phoneStream.test.mjs tests/phoneStreamHttp.test.mjs
.\deploy\phone\install-desktop-inference.ps1 -BundlePath (Resolve-Path ..\desktop-inference.bundle.mjs).Path
tailscale serve --bg --https=11443 http://127.0.0.1:11435
```

The default runtime directory is Documents/Codex/chernobog-desktop-inference.
Edit config.json's models map to change role overrides, then restart the
scheduled task. Do not publish that file: it contains the inference secret.
Provision the same secret to the Acer securely, without printing it or placing
it in command arguments, in /home/omen/.config/chernobog/desktop-inference.env:
CHERNOBOG_DESKTOP_URL and CHERNOBOG_DESKTOP_SECRET. Then, on the Acer:

```bash
sudo bash /home/omen/chernobog-voice-build/deploy/phone/enable-desktop-inference.sh
```

That installs all four phone modules and a dedicated systemd EnvironmentFile
drop-in. Existing phone credentials, history, legacy services and speech
containers remain unchanged. Authenticated GET /api/inference/status reports
the last route and fallback reason; it is not a continuous readiness probe.

`node scripts/verify-desktop-route.mjs` runs an isolated test without changing
the live phone service. It verifies Tailscale TLS, authentication, blocked
management calls, streamed generation and the actual selected route.

Measured on this installation: Qwen's initial desktop load took approximately
50 seconds. An initial routed request hit the 15-second failover threshold
and used Acer successfully. After warm-up, the Acer-to-desktop test produced
first text in 597 ms and completed in 621 ms. These are short-prompt samples,
not latency guarantees or measurements of speech recognition/synthesis.

## Rollback

On the Acer, remove only the desktop-inference drop-in, reload systemd and
restart chernobog-phone to restore its local model. Keep the EnvironmentFile
private. On Windows, stop/disable the Chernobog Desktop Inference scheduled
task and disable only `tailscale serve --https=11443 off`. Do not reset Serve:
the desktop already has other existing routes on 443 and 8190.
