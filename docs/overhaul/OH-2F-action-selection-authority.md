# Chernobog OH-2F — Action Selection & Interruption Authority

## Authority

`@chernobog/runtime ActionRuntime` is the single runtime authority for
action-selection decisions and interruption/resume decisions.

The existing cognition implementation remains the engine:

`lib/chernobog/cognition/initiativeDecision.ts`

## Governed live initiative entry points

- `decideCognitiveInitiative` — direct external calls observed: 0; governance point: exported function body; return mode: sync

## Canonical action outcomes

```text
respond
continue
plan
act
wait
defer
interrupt
cancel
resume
request approval
```

## Preserved boundaries

- Existing cognition and initiative logic remains intact behind ActionRuntime.
- DND and waiting-user behavior is not expanded or bypassed.
- Dialogue Runtime keeps conversational turn status while handing interruption
  and resume decisions to ActionRuntime.
- Sensory barge-in / voice shutdown behavior remains in the accepted sensory
  layer and does not gain execution authority.
- State Runtime projects ActionRuntime read-only.
- ActionRuntime does not import Trust or Tool Gateway and cannot execute tools.
- This slice adds no new autonomous capability.

## Completion lock

All externally used action-selection entry points from the OH-2A primary
initiative engine are governed by one ActionRuntime singleton.

No ActionRuntime method grants trust or invokes a tool.
