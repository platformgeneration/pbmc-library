PBMC LIBRARY v2.64 — ALL-CASE WHITE-SPACE FLOW LABEL FIX

Purpose
- Applies the flow-label placement correction to every current PBMC case.
- All arrow labels must remain visible and not overlap PBMC fields.
- For difficult shared routes, the renderer now prefers predefined white-space parking positions.

Included
- library.json (27 published cases, including Depop 027)
- build.py updated to renderer v18.8
- assets/pbmc-renderer-v18.8.js
- index.html for every one of the 27 case folders
- ARROW_GEOMETRY_AUDIT.md

Deployment
- Copy the contents of this ZIP into the pbmc-library repository root, preserving paths.
- Existing case.json, pbmc-data.csv and citation.bib files do not need to be replaced for this renderer/layout update.

QA
- Flow-label layer stays above PBMC boxes at final render time.
- Difficult route labels now prefer explicit white-space positions.
- Short-edge anchors, perpendicular exits/entries and max-two-corner routes remain unchanged.
- 27/27 case pages rebuilt with the shared renderer update.
