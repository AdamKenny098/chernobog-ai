# Schematic Generator Milestone 9 — Complete

## Minecraft Version Block Limits

Milestone 9 is complete once 9F is wired into both generation and conversion.

## Completed deliverables

```txt
9A — Block registry and version comparison
9B — Version command parsing and compatibility reporting
9C — Generation-time version-safe palette intent
9D — Block-by-block version validator
9E — Convert existing schematic/build to target version
9F — Final registry hardening and fallback coverage
```

## Final capability

The schematic generator can now:

- accept a target Minecraft version during generation
- store `targetMinecraftVersion` in metadata
- filter/repair block choices through a separate block registry
- substitute modern blocks with version-safe alternatives
- validate every placed block against the target version
- report invalid blocks with coordinates when something leaks through
- convert an existing generated build to another Minecraft version
- run a final hardening pass before validation to catch registry gaps

## Example commands

```txt
generate tower version 1.8.8
generate medieval house using only 1.12.2 blocks
generate factory vanilla 1.20.1
generate spawn compatible with 1.8.8
validate schematic <id> version 1.8.8
convert schematic <id> to version 1.8.8
```

## Practical interpretation

Milestone 9 does not mean every schematic will look identical after downgrading. It means Chernobog now has a proper architecture for version targeting:

- registry knowledge
- fallback logic
- generation-time intent
- post-generation repair
- block-by-block validation
- conversion output
- final hardening coverage

That is enough to treat Minecraft version targeting as a real generator feature rather than a loose prompt hint.

## Suggested next milestone

Milestone 10 should move beyond block version limits and into **palette generation / visual style control**, because the version system now gives palette logic a safe foundation.
