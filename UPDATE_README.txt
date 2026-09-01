PBMC LIBRARY v2.59 — ALL-CASE TRANSACTION ARROW SHORT-EDGE DISTRIBUTION FIX

Purpose
- Applies the transaction-arrow geometry correction to every current PBMC case.
- All arrowheads now enter only via a SHORT edge of the relevant Transaction field, but the anchor positions are distributed along that short edge rather than all meeting in the middle.
- The same shared rule applies to all cases; Apple is not treated as a special case.

Included
- library.json (26 published cases, including Carousell 026)
- build.py updated to renderer v18.4
- assets/pbmc-renderer-v18.4.js
- index.html for every one of the 26 case folders
- ARROW_GEOMETRY_AUDIT.md

Deployment
- Copy the contents of this ZIP into the pbmc-library repository root, preserving paths.
- Existing case.json, pbmc-data.csv and citation.bib files do not need to be replaced for this geometry-only update.
- The old assets/pbmc-renderer-v18.2.js and v18.3.js may remain in the repository; build.py now uses v18.4.

QA
- 12/12 directed transaction routes verified against short-edge-only anchors with distributed positions.
- 26/26 case pages rebuilt with the new shared renderer geometry.
