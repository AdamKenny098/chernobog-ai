# OH-1J compatibility bridge

Canonical architectural owner: `apps/chernobog-mobile`.

Accepted physical Gradle source remains: `mobile/android-companion`.

This is intentional. Existing Android and PA acceptance verifiers are path-sensitive to the legacy source root, so OH-1J establishes ownership and transport boundaries before physical relocation. The legacy source remains the single implementation; there is no copied Android implementation under `apps/chernobog-mobile`.

The later accepted Alkimii Accessibility Service must remain enabled, scoped only to `com.alkimii.connect.app`, and observation-only. Historical tests or assumptions that prohibit this accepted service must not be restored.

A later cleanup may physically relocate the Gradle project after the verification estate no longer requires the historical path.
