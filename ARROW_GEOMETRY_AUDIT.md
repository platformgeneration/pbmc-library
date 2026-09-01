# PBMC Library v2.78 Arrow Geometry Audit

Purpose: remove the remaining far-right floating label behavior for the Partner → Owner transaction route.

Renderer change
- Removed the shared hard-coded parking position for the `partner>owner` route label.
- The route now uses the same near-route auto-placement logic as the other standard transaction labels.
- Result: labels such as `Supply` no longer sit far away at the lower-right edge across cases.

Rules retained
- Transaction arrows start or end only on the short edge of the relevant Transaction field.
- Anchor points remain distributed along the short edge.
- Every route has at most two corners.
- Routes leave and enter transaction fields perpendicularly.
- Labels stay in nearby white space and avoid fields and other labels where possible.

QA summary
- Removed remote shared parking spot for `partner>owner`.
- Rebuilt all current case pages with renderer v18.11.
