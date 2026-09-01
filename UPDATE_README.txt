PBMC LIBRARY v2.63 — ALL-CASE FLOW LABEL VISIBILITY FIX

Purpose
- Applies the flow-label visibility correction to every current PBMC case.
- All arrow labels remain in surrounding white space where possible.
- No arrow label may be hidden behind PBMC fields, actors or the CVU.

Included
- library.json (27 published cases, including Depop 027)
- build.py updated to renderer v18.7
- assets/pbmc-renderer-v18.7.js
- index.html for every one of the 27 case folders
- ARROW_GEOMETRY_AUDIT.md

Deployment
- Copy the contents of this ZIP into the pbmc-library repository root, preserving paths.
- Existing case.json, pbmc-data.csv and citation.bib files do not need to be replaced for this renderer/layout update.

QA
- Flow-label layer is forced above all PBMC boxes at final render time.
- Short-edge anchors, perpendicular exits/entries and max-two-corner routes remain unchanged.
- 27/27 case pages rebuilt with the shared renderer update.
