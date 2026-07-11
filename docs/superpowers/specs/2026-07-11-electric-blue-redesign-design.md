# Relay Electric Blue Redesign

## Intent

Turn Relay into a sleek, high-signal AI command center inspired by the approved deep-navy reference. Preserve every existing route and workflow while making the dashboard feel faster, calmer, and easier to scan.

## Visual Direction

- Deep navy workspace with electric-blue accents and restrained glass surfaces.
- Slim navigation rail with compact labels, clear active state, and visible approval count.
- Four top-level metrics, followed by a focused Today brief and compact schedule.
- Priority work, confirmations, and notification intelligence are the only dashboard detail panels; notes, calls, activity, and settings remain in dedicated sections.
- Animated ambient aurora, staggered panel entrance, and pulsing Relay status orb use transform/opacity only.
- Existing Carbon, Light, Dawn, and Ocean themes remain available from the top-right hover/focus theme rail.

## Performance Contract

- Remove backdrop blur from the app shell and ordinary cards.
- Limit dashboard list rendering to the most relevant items.
- Defer search filtering while the user types.
- Use content visibility for long section surfaces.
- Respect `prefers-reduced-motion` and avoid layout-driven infinite animation.

## Responsive Contract

- Desktop uses a 224px sidebar and dense two-column command layout.
- Tablet collapses the sidebar and preserves a readable dashboard grid.
- Mobile uses the existing bottom dock, single-column panels, touch-sized controls, and no horizontal overflow.

## Fidelity Ledger

1. Dark navy canvas and luminous blue atmosphere.
2. Compact left navigation with bright active state.
3. Thin outlined panels with subtle interior depth.
4. Glanceable metric strip above the main command surface.
5. Blue status glow and restrained data visualization accents.
6. Tight typography hierarchy with uppercase utility labels.

