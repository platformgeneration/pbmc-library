# PBMC Library v2.64 Arrow Geometry Audit

Purpose: reinforce the shared flow-label placement rule for all current PBMC cases.

Rules
- Transaction arrows may only start or end on a SHORT edge of the relevant Transaction field.
- Anchor points are distributed along that short edge instead of all meeting at the center.
- Every arrow route may have at most two corners (two bends / three straight segments).
- Every arrow label must sit in surrounding white space where possible and must never be hidden behind PBMC fields or actors.
- When a route has a predefined white-space parking position, the renderer now prefers that position before trying generic auto-placement.

Renderer fix
- Added preferred manual label parking positions in white space for difficult routes.
- The auto-placement engine now evaluates route.label as a first-class candidate before broader search.
- Final z-order still keeps the flow-label layer above fields, actors and the CVU.

QA summary
- 12/12 directed routes keep short-edge-only anchors
- 12/12 directed routes keep a maximum of two corners
- flow-label layer forced to top z-order across all rebuilt case pages
- explicit white-space label parking added for difficult shared routes
- 27/27 case pages rebuilt with the shared renderer update
