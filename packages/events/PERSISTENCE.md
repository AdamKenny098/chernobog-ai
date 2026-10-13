# Event persistence ownership

The Events package owns Event Spine persistence, replay, retention, and diagnostics storage through `packages/events/src/store.ts`. Other domains publish through event contracts rather than writing Event storage directly.
