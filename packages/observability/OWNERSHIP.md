# Observability ownership

This package owns common architecture-level shapes for:

- trace IDs;
- structured diagnostic metadata;
- health metadata;
- execution trace shapes;
- timing metadata;
- error metadata.

Domain-specific diagnostic meaning remains with the owning domain. Observability does not own persistence, business state, trust authority, tool execution, event storage, or model execution.
