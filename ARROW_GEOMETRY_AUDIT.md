# PBMC Library v2.63 Arrow Geometry Audit

Purpose: reinforce the shared transaction-arrow label rule for all current PBMC cases.

Rules
- Transaction arrows may only start or end on a SHORT edge of the relevant Transaction field.
- Anchor points are distributed along that short edge instead of all meeting at the center.
- Every arrow route may have at most two corners (two bends / three straight segments).
- Every arrow label must sit in surrounding white space where possible and must never be hidden behind PBMC fields or actors.

Renderer fix
- Flow labels remain grouped in a dedicated .flow-labels layer.
- At the end of render(), the .flow-labels layer is re-appended so it always sits above all fields, actors and the CVU.

QA summary
- 12/12 directed routes keep short-edge-only anchors
- 12/12 directed routes keep a maximum of two corners
- flow-label layer forced to top z-order across all rebuilt case pages
- 27/27 case pages rebuilt with the shared renderer update
