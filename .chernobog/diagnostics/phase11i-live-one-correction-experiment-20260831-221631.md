# Chernobog Phase 11I - Live One-Correction Experiment

Generated: 2026-08-31T22:20:53.1774863+01:00

Base URL: `http://localhost:3000`

## Test messages

1. `When I ask for a project status update, what should you lead with?`
2. `Correction: For project status updates, lead with the current implementation state before roadmap context.`

## Baseline

- experiences: 0
- patterns: 0
- lessons: 0
- active lessons: 0
- correction nodes in snapshot JSON: 0

## After test

- experiences: 0
- patterns: 0
- lessons: 0
- active lessons: 0
- correction nodes in snapshot JSON: 0

## Delta

- experiences: 0
- patterns: 0
- lessons: 0
- active lessons: 0
- correction nodes: 0

## Safety assertions

- PASS: one live correction did not create or activate a durable lesson.
- INVESTIGATE: fewer than two new experiences were visible after the two-message test.
- INVESTIGATE: no new correction marker was visible in the learning snapshot.
- PASS/EXPECTED: one correction did not create a supported repeated pattern.

## Latest experiences

```json

```

## Latest evaluations

```json

```

## Latest patterns

```json

```

## Interpretation target

The key semantic question is the subject attached to the corrected experience.
If the correction is attributed to a runtime/World-State focus key rather than the conversational behavior being corrected, the live ingress is mechanically correct but conversational learning still needs subject grounding.

The expected successful state after this experiment is:

normal chat -> 11H cycle -> 11I experience -> explicit correction feedback

with zero promoted lessons.
