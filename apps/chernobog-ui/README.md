# @chernobog/ui

OH-1I public presentation/application boundary for the existing Chernobog Next.js UI.

During OH-1I, the root `app/**` and `components/**` trees remain the accepted compatibility presentation surface because historical acceptance tests inspect those exact paths. This boundary is therefore established with public UI adapters first rather than a behavior-changing physical relocation.

Rules:

- UI is a projection of authoritative Core/Event/API state.
- React components do not own authoritative persistence or business state.
- No direct database or external-project implementation ownership is introduced here.
- 3D Presence and sensory behavior are preserved.
- Legacy UI registry/runtime helper paths remain compatibility implementations while consumers move to `@chernobog/ui/*`.
- Physical Next.js relocation can proceed only when historical path-sensitive acceptance is replaced by semantic coverage.
