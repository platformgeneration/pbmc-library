PBMC LIBRARY v2 — MASTER RULES

PURPOSE
The PBMC Library is a reusable reference library, not a written case-study archive.
The Platform Lens video is the case study: why the event happened, what changed,
and why it matters.

CASE PAGE ORDER
1. Case header
2. Platform Lesson
3. PBMC Snapshot
4. PBMC Data
5. Platform Lens / Watch the Case Study
6. Sources
7. Use / Adapt / Cite
8. Cyclic Previous / Next navigation

PBMC DATA
- The table is the structured version of the canvas.
- Regular PBMC fields are main rows.
- Transaction arrows are SUB-ROWS of the relevant perspective's Transaction field.
- For each perspective:
    → Counterparty · Flow = outgoing
    ← Counterparty · Flow = incoming
- Flow sub-rows include a short semantic explanation.
- Copy table produces tab-separated structured data.
- CSV and case JSON are downloadable.

CANVAS MASTER
- Renderer: assets/pbmc-renderer-v18.2.js
- All 12 directed role-to-role routes are native.
- Long Owner↔Partner and Provider↔Consumer routes are NOT demo extras.
- Arrow and arrow-label color is determined by the originating perspective.
- Every canvas automatically displays:
    CREATED BY PLATFORM GENERATION
  in the top-right inside the outer frame.

NAVIGATION
- Publication order lives in library.json.
- Previous and Next are generated from that order.
- First.previous wraps to last.
- Last.next wraps to first.
- Therefore there is never a dead end.
- With one published case the cycle naturally points back to that case ("Start again").

CONTENT MODEL
- One case = one case.json.
- Do not manually build individual PBMC canvases.
- Full field explanations remain static HTML on the public page for human,
  search-engine and AI readability.
- The video carries narrative case-study depth; the library page stays compact.

LICENSE
PBMC cases: CC BY 4.0 with attribution.
Suggested attribution:
Platform Business Model Canvas (PBMC), Dr. Davis Eisape / Platform Generation
