# Milestone 6 Architecture Note

The key architecture rule:

> High-level commands plan and orchestrate. Deterministic compilers place final blocks.

## Layers

1. Create graph support
2. Create machine compiler
3. Scene planner
4. Pack compiler
5. Quality delegation to existing generators
6. Review and safe repair
7. Vanilla preview sidecar export
8. Build Department command wrapper

## Result

Chernobog can now generate individual machines, multi-structure scene packs, pack metadata, placement guides, reviews, repairs, and browser-compatible preview schematics.
