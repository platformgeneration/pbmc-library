PBMC LIBRARY v2.65 — ROUTE-ATTACHED WHITE-SPACE LABEL FIX

Purpose
- Keep every flow label in white space without allowing it to float far away from its arrow.
- Labels stay visually attributable to their own route.

Rules preserved
- transaction arrows only on short edges
- distributed short-edge anchors
- perpendicular departure/arrival
- maximum two bends
- labels may not overlap PBMC fields, actors or CVU

New placement rule
- Prefer a free parking position directly beside the label's own route.
- Difficult owner↔partner routes park labels beside their lower horizontal route segments, where the canvas has real white space.

QA
- 27/27 case pages rebuilt with renderer v18.9.
