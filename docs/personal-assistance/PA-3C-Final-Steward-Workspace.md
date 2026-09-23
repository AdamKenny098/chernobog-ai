# PA-3C — Final Steward Workspace

This bulk milestone closes the remaining PA-3C user-interface work on top of the
accepted PA-3C1 Command Center binding.

## Canonical authorities

- PA-3A1 owns durable responsibilities.
- PA-1A owns available / busy / away / DND.
- Cognition attention and initiative queues remain transient runtime systems.

## Final workspace

The live Command Center Steward surface now provides:

- active / needs-user / important / critical / overdue counts;
- All Active, Needs You, Waiting Elsewhere, Scheduled, Delegated and Closed groups;
- text, priority and source filters;
- responsibility detail inspection;
- "why surfaced" explanation based on ledger state;
- full PA-3A1 audit timeline;
- evidence metadata;
- due-time editing and overdue emphasis;
- resolve, dismiss, waiting-user, waiting-external, scheduled, delegated and
  triaged state controls where the PA-3A1 state machine permits them;
- closed-item reopen through `triaged`;
- attention-state-aware presentation.

`scheduled` is a responsibility-ledger state only. PA-3C does not create a
calendar event. PA-3C does not execute tools, grant permissions, send messages,
or add a second responsibility store.

## Final acceptance

The installer runs isolated TypeScript, ESLint, the PA-3C1 compatibility
verifier, the PA-3C final verifier, and the available PA-1A / PA-3A1 / PA-3B1 /
PA-3B2 regression verifiers.

One consolidated live acceptance remains after installation.
