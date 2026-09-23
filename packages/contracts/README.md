# @chernobog/contracts

Public cross-domain contracts for Chernobog OH-1.

This package intentionally contains **types and interfaces only**. It must not import runtime implementation code, UI frameworks, persistence drivers, provider-specific model code, or product/project implementations.

Initial contract domains:

- commands
- events
- tools
- trust
- models
- personal assistance
- vault

Implementation packages may refine these contracts while preserving dependency direction. Runtime wiring belongs in the later OH-1 composition slice, not here.
