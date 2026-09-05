# BWI Defense IT Ecosystem — PBMC Library case

Snapshot: 2026-09-05
YouTube: https://www.youtube.com/watch?v=aS-W57JRa_U
Slug: `bwi-defense-it`

## Modeling boundary
This case models the BWI-managed defense IT capability ecosystem that connects Bundeswehr demand with internal BWI capability, external vendors and integration partners. It does **not** claim that BWI operates an open marketplace.

## Partner-role choice
The Partner is modeled as `Integrator`: a functional ecosystem role for system integration / architecture enablement. This is not a separate legal procurement category, and the same company can act as Provider in one contract and Partner across multiple projects.

The wording deliberately avoids claiming that Integrators formally "set standards". Instead, repeated implementation choices can become **de-facto standards** if the Owner does not govern interfaces and architecture deliberately.

## Core transaction selection
Only the exchanges required to make the model work, plus the integration/standardization mechanism that differentiates this case, are drawn:
- Bundeswehr → BWI: Demand
- BWI → Bundeswehr: Service
- Vendors → BWI: Supply
- BWI → Vendors: Payment
- BWI → Integrator: Rules
- Integrator → BWI: Design
- Integrator → Vendors: Specs

All desktop arrows connect to the short vertical edge of the landscape Transaction field and use orthogonal routing. Mobile replaces the SVG routing with a readable transaction list.

## Files
- `index.html` — standalone case page
- `case.json` — structured case data for later integration into the library build/search pipeline

## Deployment note
The page uses a relative `../` fallback for “Browse all cases” and “See next platform” because the global library case order is not included in this standalone package. The library generator can replace these links with the actual next-case target.
