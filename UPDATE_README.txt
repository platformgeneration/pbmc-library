PBMC LIBRARY v2.62 — PERPENDICULAR SHORT-EDGE ARROW UPDATE

Global geometry rule
- Transaction arrows start/end only on the short edge of each Transaction field.
- Anchor positions are distributed along the short edge.
- Every route has at most two corners.
- Every route leaves the start edge at 90 degrees and meets the destination edge at 90 degrees.

Included
- library.json with 27 published cases, including Depop 027
- build.py using renderer v18.6
- assets/pbmc-renderer-v18.6.js
- rebuilt index.html for all 27 case folders
- ARROW_GEOMETRY_AUDIT.md

QA
- 12/12 directed route geometries use short-edge anchors only
- 12/12 routes have <= 2 bends
- 12/12 routes are perpendicular at both Transaction-field contacts
- 27/27 case pages rebuilt
