PBMC LIBRARY v2.60 — ALL-CASE TRANSACTION ARROW TWO-CORNER FIX

Purpose
- Applies the transaction-arrow geometry correction to every current PBMC case.
- All arrowheads enter only via a short edge of the relevant Transaction field.
- Anchor positions stay distributed along that short edge.
- Every arrow route has at most two corners.

Included
- library.json (26 published cases, including Carousell 026)
- build.py updated to renderer v18.5
- assets/pbmc-renderer-v18.5.js
- index.html for every one of the 26 case folders
- ARROW_GEOMETRY_AUDIT.md

Deployment
- Copy the contents of this ZIP into the pbmc-library repository root, preserving paths.
- Existing case.json, pbmc-data.csv and citation.bib files do not need to be replaced for this geometry-only update.
- Older renderer files may remain in the repository; build.py now uses v18.5.

QA
- 12/12 directed transaction routes verified against short-edge-only anchors.
- 12/12 directed transaction routes verified with a maximum of two corners each.
- 26/26 case pages rebuilt with the new shared renderer geometry.
