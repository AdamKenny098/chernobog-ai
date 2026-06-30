# Memory Correction & Audit Trail Architecture

## Scope

This architecture note describes V5.6.7 correction handling for structured vault memory.

The correction layer sits beside the existing memory store:

```txt
entries.json
manifest.json
audit-log.json
corrections.json
```

## Main files

```txt
lib/modules/vault-brain/memoryCorrections.ts
lib/modules/vault-brain/memoryCorrectionCommands.ts
```

## Design rule

Correction is not approval.

The correction layer may edit fields such as title, body, projectId, version, tags, confidence, and memoryType.

It must not directly alter status.

Status remains controlled by the review/approval flow.

## Correction record

Each correction records:

```ts
export type VaultMemoryCorrection = {
  id: string;
  memoryEntryId: string;
  fieldChanged: CorrectableVaultMemoryField;
  previousValue: JsonValue;
  newValue: JsonValue;
  reason?: string;
  actor?: string;
  correctedAt: string;
};
```

## Correction flow

```txt
User issues correction command
  ↓
Command parser resolves entry id, field, and value
  ↓
Correction layer validates the field
  ↓
Correction layer blocks status edits
  ↓
Memory entry is updated
  ↓
Correction record is appended to corrections.json
  ↓
General audit event is appended to audit-log.json
  ↓
Manifest is rebuilt through the memory store
```

## Why corrections are separate from audit events

The existing audit log answers:

```txt
Something changed on this memory entry.
```

The correction log answers:

```txt
Exactly which field changed, from what value, to what value, and why.
```

Both are useful.

## Safe correction examples

```txt
move memory entry mem-123 to project chernobog
move memory entry mem-123 to version v5.6.7
retag memory entry mem-123 as chernobog, memory, correction
set memory confidence mem-123 to 0.92
correct memory type mem-123 to decision
correct memory title mem-123 to V5.6.7 Correction Policy
```

## Unsafe correction example

```txt
correct memory status mem-123 to approved
```

This is blocked. Use:

```txt
review memory entry mem-123
approve memory entry mem-123
```

## V5.6.7 boundary

V5.6.7 does not make Chernobog autonomously correct memory.

It only gives the user and future approved workflows a safe correction mechanism.
