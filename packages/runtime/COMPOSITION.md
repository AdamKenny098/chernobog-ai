# Composition ownership

`@chernobog/runtime` is the OH-1 composition root.

It is allowed to know concrete **public package implementations** and assemble them. Individual domains should not recreate this cross-package wiring internally.

## Slots

- Event Spine -> `@chernobog/events`
- Trust Engine -> `@chernobog/trust`
- Tool Gateway -> `@chernobog/tools`
- Model Gateway -> `@chernobog/models`
- Vault -> `@chernobog/vault`
- Personal Assistance providers -> `@chernobog/personal-assistance`
- Core runtime -> `@chernobog/core`
- Observability -> `@chernobog/observability`
- External project adapters -> `@chernobog/external-projects`
- Public contracts -> `@chernobog/contracts`

## Persistence

OH-1N does not import another package's private persistence implementation. Persistence remains owned by the domains established in OH-1L. The root records those owners and composes at the package boundary.

## Runtime cutover

`composeChernobogRuntime()` is opt-in in OH-1N. Existing live entrypoints and accepted singleton behavior remain untouched.

OH-1O may remove compatibility paths that are proven superseded. The major runtime redesign and broader dependency-injection changes remain OH-2.
