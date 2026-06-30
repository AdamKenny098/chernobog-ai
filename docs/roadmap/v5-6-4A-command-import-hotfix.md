# V5.6.4A — Command Import Hotfix

## Purpose

Fix a command bridge compatibility issue between V5.6.3 structured memory command names and V5.6.4 review command routing.

## Bug

The V5.6.4 verifier could fail with:

```txt
isStructuredMemoryCommand is not defined
```

This was caused by `commands.ts` calling the V5.6.4 structured memory command helper without importing it when an older V5.6.3 import already existed.

## Fix

- Canonicalize imports in `lib/modules/vault-brain/commands.ts`.
- Add old/new compatibility aliases in `lib/modules/vault-brain/structuredMemoryCommands.ts`.

## Completion condition

```powershell
npm run chernobog:v5.6.4:verify
npx tsc --noEmit
npm run lint
```

The V5.6.4 verifier must pass.
