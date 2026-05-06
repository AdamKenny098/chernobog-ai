# Chernobog Design Doctrine

## Visual Identity

Chernobog should feel like a severe, intelligent, militarized command system.

The visual language should avoid generic SaaS dashboard aesthetics.

Chernobog should feel:

- dark
- premium
- synthetic
- severe
- ceremonial
- tactical
- intelligent
- local and powerful

## Core Symbol

The central Chernobog eye/sigil is a key identity element.

It should remain:

- central to the dashboard
- visually distinct
- dark and angular
- surrounded by command-interface panels
- treated as the core projection source

The eye should not be replaced by generic icons or ordinary dashboard graphics.

## Color Language

Primary visual base:

- near-black backgrounds
- charcoal surfaces
- subtle amber/orange accents
- muted red danger states
- green/teal readiness states only where useful

Red should be used carefully. It should signal danger or alert states, not flood the interface.

## UI Structure

The dashboard should preserve:

- command header
- subsystem rail
- central core eye
- directive feed
- command composer
- telemetry/context panels
- workflow/planner/debug panels

Changes should improve clarity without destroying the existing dashboard silhouette.

## Typography and Spacing

The interface uses compact uppercase tracking and dense command-panel text.

Text must remain readable. Avoid overlapping text, cramped status values, and panels with uncontrolled overflow.

## Tailwind Rule

Chernobog UI uses Tailwind with complex arbitrary values.

Do not replace existing Tailwind styling with generic object styles unless explicitly requested.

Bad pattern:

```tsx
const styles = { backgroundColor: "#fff" };
<div className={`${styles.backgroundColor}`} />
```

Good pattern:

```tsx
<div className="bg-[rgba(255,170,90,0.06)]" />
```

## Patch Design Rule

UI patches should be small and preserve the current visual system.

Good UI patches:

- add a small status badge
- improve overflow behavior
- make a panel more readable
- expose existing execution state more clearly
- improve developer/debug visibility

Risky UI patches:

- replace the entire layout
- extract major panels into new components
- remove the Chernobog sigil or eye
- convert Tailwind design into generic CSS
- introduce bright modern SaaS styling

## Final Rule

Chernobog should never look like a generic admin dashboard.
