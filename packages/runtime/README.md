# @chernobog/runtime

OH-1N establishes the explicit Chernobog composition/bootstrap boundary.

The package composes accepted public package boundaries only:

- `@chernobog/events`
- `@chernobog/trust`
- `@chernobog/tools`
- `@chernobog/models`
- `@chernobog/vault`
- `@chernobog/personal-assistance`
- `@chernobog/core`
- `@chernobog/observability`
- `@chernobog/external-projects`
- `@chernobog/contracts`

This slice does **not** cut existing application entrypoints over to the new root. That keeps accepted runtime behavior unchanged while giving OH-1O a single composition boundary to preserve during compatibility cleanup.

Major runtime redesign remains OH-2.
