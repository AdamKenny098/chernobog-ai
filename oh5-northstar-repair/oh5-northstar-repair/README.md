# OH5 governed test-milestone bridge (targeted repair)

This repair intercepts **explicit fictional test-milestone proposal and confirmation** at the authenticated `/api/chat` boundary before OH4 can produce a misleading acknowledgement. It uses the existing governed SQLite store and Obsidian projection, with owner-token validation, project registration, exact candidate matching, revision checking and audit approval IDs. It deliberately **does not** implement arbitrary natural-language memory writes; that requires a separate structured review flow.

## Install (Windows PowerShell)

From the Chernobog repository root, extract this ZIP to a folder and run:

```powershell
python .\oh5-northstar-repair\install.py .
npx tsc --noEmit
```

Review `git diff`, then restart the app. The chat frontend must send `Authorization: Bearer <CHERNOBOG_OH5_OWNER_TOKEN>` for these commands to succeed; **do not put the token into a public client bundle**. If the current browser client does not send authenticated requests, the bridge will refuse writes until a server-side authenticated session or secure proxy is added. This is intentional; never silently bypass authentication.

**Retest with a new fictional name**, e.g. Project Northstar Two is not supported because names are exactly `Project <one token>`; use `Project Beacon` instead. Proposal must explicitly say `do not confirm` and identify Chernobog. Confirmation must begin `Lock in` or `Confirm`, mention a milestone and fictional/test classification, and identify the Chernobog project.

The earlier Northstar messages were not saved in OH5, so **re-propose Northstar first**, then confirm.

## Limitations

- The chat handler only intercepts this narrowly defined test-milestone command pattern, not all memory mutations.
- Candidate lookup examines the newest 100 records in the project; if not found, it fails closed.
- SQLite confirmation commits before Obsidian projection. If projection fails, the response reports an error although the SQLite confirmation may already exist; inspect the audit before retrying. A production general-purpose implementation should add reconciliation.
- The proposal stores the original owner's statement in the governed record. Do not use sensitive text as test data.
- This patch has not been run against the user's local environment; run typechecking and the existing tests before committing.

## Undo

Restore `app/api/chat/route.ts.oh5-backup` over `app/api/chat/route.ts` and remove `lib/chernobog/pipeline/governedMilestoneCommand.ts`.
