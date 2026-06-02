# Discord Ingest Workflow

Status: implemented
Version: V5.5
System Area: Discord ingest, vault triage, vault pull request review
Last Updated: 2026-06-01

## Purpose

The Discord ingest workflow lets Chernobog read project ideas from a configured Discord channel, classify them into meaningful fragments, route them toward vault destinations, create a reviewable vault pull request, and apply only approved changes to the local vault.

The workflow is intentionally review-first. Chernobog does not write Discord ideas directly into the vault without approval.

## Completed V5.5 Scope

V5.5 implements the full safe Discord idea capture loop:

Discord channel messages
→ normalized non-bot message list
→ extracted idea fragments
→ classification
→ vault routing preview
→ reviewable vault pull request
→ full review workspace
→ approve / reject / reset changes
→ apply approved changes only
→ lock applied pull request

## Environment Requirements

The Discord ingest module expects the Discord bot and channel environment variables to be configured in `.env.local`.

Required values:

* `DISCORD_BOT_TOKEN`
* `DISCORD_IDEA_CHANNEL_ID`

The bot must have access to the target server and channel.

Required Discord permissions:

* View Channel
* Read Message History
* Message Content Intent enabled in the Discord Developer Portal

## Main Commands

### Check Discord Status

```txt
discord status
```

Checks whether the Discord ingest module is configured and whether the bot/channel connection works.

### Preview Discord Ideas

```txt
discord scan ideas
discord scan last 100 messages
```

Fetches recent messages from the configured idea channel and previews readable non-bot messages.

No vault files are changed.

### Triage Discord Ideas

```txt
discord triage ideas
discord triage last 100 messages
```

Fetches channel messages, extracts idea fragments, classifies them, and routes them toward possible vault destinations.

No vault files are changed.

### Review Triage Plan

```txt
show triage plan
summarize triage plan
discard triage plan
```

Shows, summarizes, or discards the latest in-session Discord triage plan.

No vault files are changed.

### Create Vault Pull Request

```txt
create vault pr from triage plan
show vault pr
discard vault pr
```

Creates a vault pull request object from the stored triage plan.

The review workspace opens automatically at:

```txt
/review/vault-pr/<pull-request-id>
```

No vault files are changed at PR creation time.

## Review Workspace

The review workspace is a full-page review surface for proposed vault changes.

It is intended to feel closer to GitHub Desktop or Diffchecker than a small command-shell response.

The workspace shows:

* PR status
* total proposed changes
* new note count
* append count
* inbox count
* approved count
* rejected count
* pending count
* warning count
* proposed change list
* destination path
* generated content preview
* source Discord fragment
* classification and routing reasoning
* duplicate/existing destination warnings
* apply report after approved changes are written

## Review Actions

Each change can be marked as:

* `pending`
* `approved`
* `rejected`

Available workspace actions:

* Approve selected change
* Reject selected change
* Reset selected change
* Approve filtered changes
* Reject filtered changes
* Reset filtered changes
* Approve all changes
* Reject all changes
* Reset all changes
* Apply approved changes

Approval state is persisted to disk in `.chernobog/runtime/discord-vault-pr`.

Refreshing the review page should preserve the PR state.

## Apply Rules

The apply workflow is intentionally strict.

Only approved changes are applied.

Pending changes are skipped.

Rejected changes are skipped.

New project notes never overwrite existing files.

Existing-note append changes only append to existing files.

Inbox append changes may create the inbox file if missing.

All writes are forced inside the configured vault root.

Applied pull requests are locked.

Re-applying the same pull request is blocked.

## Apply Confirmation

Before applying approved changes, the review workspace shows a confirmation modal.

The confirmation explains:

* how many approved changes will be written
* that pending and rejected changes will be ignored
* that existing project notes will not be overwritten
* that the operation can create new notes and append to approved existing notes

The backend apply endpoint also requires this confirmation payload:

```json
{
  "confirm": "apply-approved"
}
```

## Apply Report

After apply, Chernobog stores an apply report on the pull request.

The report includes:

* pull request ID
* apply timestamp
* approved change count
* applied count
* skipped count
* failed count
* per-change results

The apply report remains visible after page refresh.

## Generated Vault Outputs

Project idea notes are written under:

```txt
vault/chernobog/project-ideas/
```

Inbox review items are written under:

```txt
vault/chernobog/discord/ideas-inbox.md
```

Append changes may target existing Chernobog notes such as:

```txt
vault/chernobog/module-map.md
vault/chernobog/current-state.md
```

## Safety Guarantees

V5.5 guarantees:

* Discord triage does not directly write files.
* Vault PR creation does not directly write files.
* Review actions only update PR state.
* Apply writes only approved changes.
* Pending and rejected changes are ignored.
* Existing project notes are not overwritten.
* Applied PRs cannot be edited.
* Applied PRs cannot be applied again.
* Write paths are resolved against the configured vault root.
* Runtime PR state is kept outside Git in `.chernobog/`.

## Known Limitations

V5.5 does not yet implement background Discord scanning.

V5.5 does not yet support multiple Discord idea channels.

V5.5 does not yet support editing generated proposed content inside the review workspace.

V5.5 does not yet perform semantic duplicate merging. It warns about existing destination files and duplicate destination paths, but it does not automatically merge similar ideas.

V5.5 does not yet support opening written files directly from the review report.

V5.5 does not yet have long-term database persistence. Runtime PR state is stored as JSON under `.chernobog/runtime`.

## Final Manual Test Checklist

### 1. Discord Status

Run:

```txt
discord status
```

Expected:

* Discord module reports configured.
* Bot and idea channel are visible.

### 2. Discord Scan

Run:

```txt
discord scan ideas
```

Expected:

* Recent readable non-bot messages are shown.
* No vault files are changed.

### 3. Discord Triage

Run:

```txt
discord triage ideas
```

Expected:

* Messages are classified into fragments.
* Candidate fragments are routed.
* Ignored fragments are counted.
* No vault files are changed.

### 4. Triage Plan Review

Run:

```txt
show triage plan
summarize triage plan
```

Expected:

* Latest triage plan is visible.
* Summary counts match the triage output.

### 5. Vault PR Creation

Run:

```txt
create vault pr from triage plan
```

Expected:

* PR is created.
* Review workspace opens automatically.
* No vault files are changed.

### 6. Review Workspace

In the review workspace:

* Select changes.
* Search/filter changes.
* Inspect proposed content.
* Inspect source fragment.
* Inspect reasoning.
* Check warnings.

Expected:

* UI responds correctly.
* Warning count appears when destinations exist or duplicate destinations are detected.

### 7. Approval State

Test:

* Approve one change.
* Reject one change.
* Reset one change.
* Approve filtered changes.
* Reject filtered changes.
* Reset filtered changes.

Expected:

* Status badges update immediately.
* Header counts update immediately.
* Refresh preserves state.

### 8. Apply Confirmation

Approve two safe changes.

Click:

```txt
Apply Approved
```

Expected:

* Confirmation modal appears.
* Cancel closes the modal.
* Confirm Apply proceeds.

### 9. Apply Approved Changes

Confirm apply.

Expected:

* Approved changes are written.
* Pending changes are skipped.
* Rejected changes are skipped.
* Apply report appears.
* PR status becomes applied.
* Review buttons become disabled.

### 10. Refresh Applied PR

Refresh the review page.

Expected:

* PR remains applied.
* Apply report remains visible.
* Review actions remain locked.

### 11. Reapply Block

Attempt to apply the same PR again through the API or UI.

Expected:

* UI button is disabled.
* Backend rejects reapply with an error.

### 12. Existing File Protection

Create a new PR with changes targeting notes that already exist.

Approve those changes and apply.

Expected:

* Existing project notes are not overwritten.
* Apply report marks those create operations as skipped.
* Destination warnings appear in the review workspace.

## Completion Status

V5.5 is complete when the final manual test checklist passes.

Final V5.5 result:

Discord ideas can now move safely from rough messages into reviewed vault notes through an approval workflow.
