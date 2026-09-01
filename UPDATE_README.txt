PBMC LIBRARY v2.78 — GLOBAL PARTNER→OWNER LABEL FIX

Purpose
- Removes the far-right floating label behavior for the shared Partner → Owner route.
- Applies to all current PBMC case pages.

What changed
- The shared hard-coded remote parking position for the Partner → Owner route label was removed.
- That route now uses the same near-route auto-placement logic as the other standard labels.
- Labels such as `Supply` no longer sit detached at the lower-right edge.

Included
- build.py updated to renderer v18.11
- assets/pbmc-renderer-v18.11.js
- library.json
- ARROW_GEOMETRY_AUDIT.md
- rebuilt index.html for all current case pages

Deployment
- Copy the contents of this ZIP into the pbmc-library repository root, preserving paths.
- Existing case.json, pbmc-data.csv and citation.bib files do not need to be replaced for this shared renderer update.
