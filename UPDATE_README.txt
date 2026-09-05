PBMC LIBRARY v2.80 — BWI CASE UPDATE

Base
- Built strictly on pbmc-library-v2-79-mobile-table-github-update.
- No shared renderer, CSS, build.py or existing case layout changes.
- Existing 31 generated case pages remain byte-identical to v2.79.

Added
- Case 032: BWI
- Slug: bwi-defense-it
- Headline: When does procurement become an ecosystem?
- YouTube: https://www.youtube.com/watch?v=aS-W57JRa_U
- Platform Lesson: Outsource integration. Not orchestration.

PBMC roles
- Consumer: Bundeswehr
- Provider: Vendors
- Partner: Enablers
- Owner: BWI
- Core Value Unit: IT Service

Transactions
- Consumer → Owner: Demand
- Owner → Consumer: Service
- Provider → Owner: Supply
- Owner → Provider: Payment
- Owner → Partner: Rules
- Partner → Owner: Design
- Partner → Provider: Specs

QA
- Uses the unchanged v18.11 renderer from the v2.79 master.
- All seven flow routes are native renderer routes.
- Label-placement audit: no field, CVU or label collisions for the active flow set.
- All arrows use the frozen short-edge / perpendicular-anchor geometry from the master.
- Mobile data table inherits the v2.79 whole-table horizontal-scroll behavior.
- No TTS spelling remains: all “bee double-you why” occurrences are normalized to BWI.

Deployment
Copy this ZIP into the repository root, preserving paths.
It adds the new case folder and replaces library.json with the 32-case publication list.
