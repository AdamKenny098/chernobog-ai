# Owner memory — companion 0.6.0

The Acer phone core is authoritative. Conversation JSON remains separate from
`/var/lib/chernobog-phone/owner-memory/owner-memory.sqlite`. No legacy vault,
OH5 database, project memory, or old chat is imported or modified.

The implementation reuses the pure OH5 `evaluateMemoryMutation` and
`evaluateRetrievalScope` policies. The legacy GovernedMemoryStore and Recall
Service require better-sqlite3, registered project vault layouts and legacy
storage authority. They are not opened by this service. A small owner-scope
adapter uses Node's built-in SQLite, transactions, WAL, FULL synchronization,
revision checks and content-free mutation audit events. Confirmation approval
metadata is created only after authenticated owner operations, never by a
model or a saved note. The fixed scope is `owner-personal`.

## Use

- `Remember that my favourite drink is jasmine tea.` saves explicitly.
- `What do you remember?` lists confirmed memories.
- `Forget favourite-drink` or `Forget <exact memory ID>` removes one memory.
- `Remember this` asks for the exact fact instead of guessing what to save.
- `Forget that` works only when the preceding memory response identified one
  current memory; ambiguous references do not delete anything.
- Companion Memory supports adding, listing, editing and confirmed deletion.

Use a stable label for each topic. Exact duplicate facts and conflicting
labels are rejected; updates require the previous ID and revision. Updates
replace the active fact and retain only content-free audit metadata for the
old revision. No inferred or model-generated records are saved. Sensitive
facts are saved only when the authenticated owner explicitly requests it.
Semantic conflicts across differently labelled notes are not automatically
detected; the model is instructed to ask rather than choose conflicting data.

Recall selects at most four relevant confirmed records within 2400 JSON
characters. It uses lexical matching, not embeddings, and may miss paraphrases.
Only these selected records reach desktop inference; the database stays on
the Acer. Records are marked as quoted untrusted data and cannot authorize
tools, approve writes, or execute memory commands. Missing direct personal
fact lookups without relevant user-provided chat context return a deterministic
no-confirmed-memory response rather than asking the model to invent a fact.

Forgetting removes the active record and its future recall. Chat messages,
phone transcript history, SQLite recovery artifacts and existing backups are
separate; this is not a forensic data-erasure operation. Previously recalled
assistant turns are excluded from model history when their memory IDs are no
longer current. Deterministic memory-command transcripts are never replayed
as model context. Ordinary facts directly typed in a chat remain in that chat.

## API and authentication

Use the existing phone-core bearer credential. All responses are no-store.
GET `/api/memories` returns active owner-confirmed facts. POST accepts:

```json
{"action":"save","key":"favourite-drink","content":"My favourite drink is tea."}
```

Updates add `id` and `expectedRevision`; deletes use action `delete`, `id`
and `expectedRevision`. Stale edits, duplicate labels and writes while a reply
is running return 409. Scope, status, source and approval are server-managed;
attempts to supply those fields are rejected. Existing cross-origin checks
apply. The desktop inference credential cannot access Acer memory APIs.

## Build and verification

The committed `scripts/phone-memory.mjs` is generated from the TypeScript
adapter plus the existing OH5 policies; regenerate after changing either:

```powershell
npx --no-install esbuild packages/vault/src/phoneOwnerMemory.ts --bundle --platform=node --format=esm --target=node22 --outfile=scripts/phone-memory.mjs
node --test tests/phoneMemory.test.mjs tests/phoneCore.test.mjs tests/phoneInterface.test.mjs tests/phoneStream.test.mjs tests/phoneStreamHttp.test.mjs tests/phoneInferenceRouter.test.mjs
```

`node scripts/verify-phone-memory.mjs` runs a real isolated process on a free
loopback port, uses local Acer Gemma, saves/recalls/forgets across actual process
restarts and deletes only its generated temporary test directory. The local model uses a
64-token processing batch to avoid the observed Vulkan GPU-memory failure;
the desktop gateway continues using its own model options.
Pass `--desktop` on the Acer to test the provisioned Tailscale inference route;
the script reports whether desktop inference or local fallback actually ran.

## Activation and backup

Node 22.22.1 on the Acer supports the required built-in SQLite API. The
updated APK is 0.6.0; install over the existing app with the same signing key.
Device credentials, pairing, chat history, heartbeats, reminders and existing
service units remain intact. Memory UI requires the server update first.

The current session staged the release and tests under
`/home/omen/chernobog-voice-build`. On the Acer run:

```bash
sudo bash /home/omen/chernobog-voice-build/deploy/phone/enable-memory.sh
```

For a fresh checkout, run `sudo bash deploy/phone/enable-memory.sh` there.
The activation script tests first, stops only chernobog-phone, backs up its
data and modules in a root-only timestamped `/var/backups/chernobog-phone/`
directory, installs all six modules, then restarts and checks liveness. Failure
restores previous modules. There is no legacy migration or data conversion;
the separate memory database is created when the new core starts. Existing
phone credentials and desktop inference configuration are unchanged.

For later consistent backups, stop chernobog-phone, archive the whole
`/var/lib/chernobog-phone` directory (including SQLite WAL/SHM if present),
restrict the archive to root, then restart. Never copy only a live SQLite main
file without its WAL or a SQLite backup operation. Backup archives contain
private conversations and may retain memories subsequently forgotten.

## Rollback

Set `backup` to the exact directory printed by the activation script:

```bash
sudo systemctl stop chernobog-phone
sudo cp -a "$backup/scripts/." /opt/chernobog-phone/scripts/
sudo systemctl start chernobog-phone
```

Keep the new memory database for inspection; restoring older modules disables
memory without deleting it. If reverting data is explicitly required, preserve
the current directory first and restore the archive while the service is
stopped. Restoring an older backup can resurrect forgotten memories or lose
new conversations, so do not do that as a routine code rollback.

## Verified versus pending

Server tests cover owner confirmation, persistence, bounded and irrelevant
recall, revision conflicts, updates/deletes, ambiguity, authentication,
cross-origin rejection, scope tampering, corrupt-store failure and existing
chat/streaming/fallback behavior. Real Acer testing saved a fact, killed and
restarted the isolated core, recalled it in a different conversation, forgot
it, restarted again and received the deterministic unknown-fact response.
This passed with local Gemma, with desktop-timeout fallback, and with the
warmed desktop Qwen route over Tailscale (confirmed by route status).
Production stores were untouched. Android build, unit tests and lint pass;
the new memory adapter also passes focused strict TypeScript checking.

Production activation still requires an interactive sudo password. USB phone
installation and visual/on-device memory screen testing require an authorized
connected phone; none was connected during this implementation.
