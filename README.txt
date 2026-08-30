PBMC LIBRARY v2 — MASTER RULES

PURPOSE
The PBMC Library is a reusable reference library, not a written case-study archive.
The Platform Generation video is the case study: why the event happened, what changed,
and why it matters.

CASE PAGE ORDER
1. Case header
2. PBMC Snapshot
3. Platform Generation / Watch the Case Study
4. Platform Lesson
5. PBMC Data
6. Sources
7. Use / Adapt / Cite
8. Cyclic Previous / Next navigation (always labeled See previous/next platform)

PBMC DATA
- The table is the structured version of the canvas.
- Regular PBMC fields are main rows.
- Transaction is always ONE fixed table row. All arrows touching that perspective are contained inside the Transaction value cell.
- For each perspective:
    → Counterparty · Flow = outgoing
    ← Counterparty · Flow = incoming
- Transaction flows include their short semantic explanations inside the same Transaction cell.
- No variable transaction sub-rows: table row count/order stays comparable across cases.
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

OPEN USE / ATTRIBUTION MODEL
- Case-specific analysis and structured case data: CC BY 4.0.
- PBMC canvas/template and copyrightable visual presentation: CC BY-SA 4.0.
- Users may reproduce, teach with, use commercially and adapt the PBMC.
- Attribution must remain clearly visible:
  Platform Business Model Canvas (PBMC), Dr. Davis Eisape / Platform Generation — platformgeneration.com
- Adapted versions should state:
  Adapted from the Platform Business Model Canvas (PBMC), Dr. Davis Eisape / Platform Generation — platformgeneration.com
- Adapted PBMC canvases must be shared under CC BY-SA 4.0 or a compatible license.
- An unmodified Official PBMC should retain its displayed provenance rather than having Platform Generation attribution removed or replaced.
- Adapted versions may use their own branding, but must retain PBMC attribution and must not be presented as Official PBMC.
- Platform Generation logos and the Official PBMC designation are excluded from the Creative Commons licenses.
- Repository software/build code is publicly viewable but is not released under an open-source software license unless a separate LICENSE explicitly says otherwise.

CANVAS TYPOGRAPHY
- Field labels sit high in each field.
- Field values use regular weight, not bold.
- Compact fields preserve clear vertical space between label and value.

VIDEO RULE
- The case-study section is optional.
- If media.youtube_url is empty, no video placeholder or video section is rendered.
- If a YouTube URL exists, the video section appears directly below the PBMC Snapshot and before Platform Lesson.

YOUTUBE THUMBNAIL RULE
- media.youtube_url is optional.
- Without it, no video section is rendered.
- With it, a clickable 16:9 YouTube thumbnail is rendered automatically.
- The video block contains only the eyebrow, title, thumbnail/play button and YouTube link — no explanatory paragraph.
- maxresdefault is tried first; hqdefault is used as fallback.
- media.youtube_title is optional; the generic title is used when empty.

SEARCH / BROWSING RULE
- There is no required standalone library landing page in the user flow.
- The library root redirects directly to the first published PBMC.
- Every PBMC page contains search beside the canvas controls.
- Autocomplete is generated from library.json and searches company, headline, industry and topics.
- Arrow keys + Enter work in autocomplete.
- See next platform stays beside search for rapid browsing.

VISUAL IDENTITY
- Typography and spacing are aligned more closely to platformgeneration.com using Poppins-style geometric sans.
- Main colors are black, white, warm grey and Platform Generation orange.
- Official logo assets can replace the temporary HTML wordmark as soon as they are supplied.

OFFICIAL LOGOS
- assets/platform-generation-logo-black.png is used on white/light backgrounds.
- assets/platform-generation-logo-white.png is used on black/dark backgrounds.
- The canvas embeds the black logo directly into the SVG so screenshots retain provenance.

CASE HEADER RULE
- No Back to PBMC Library link: the root redirects into the PBMC browser, so that link would loop.
- Search PBMCs and See next platform sit at the top of every case, above PBMC Case XXX.
- Desktop case tags stay on one line where space permits.
- Header and hero are intentionally compact so the canvas appears quickly.

UNIFIED CASE HEADER
- Search PBMCs / See next platform is the first row of the case header.
- Below it: PBMC Case XXX · Snapshot made in Month YYYY.
- Then platform name, case question and tags.
- The canvas follows immediately; there is no second PBMC heading.
- The small usage note sits below the canvas.

COPY BUTTON RULE
- Copy table uses navigator.clipboard when available.
- A textarea/document.execCommand fallback is included for browsers or contexts that block Clipboard API access.
- Success is confirmed with 'Copied'; failure is shown explicitly.

CANVAS ACTOR TYPOGRAPHY
- Perspective labels (Owner, Provider, Consumer, Partner) are light/medium, not bold.
- Actor names (e.g. Scalable, Venues, Investors, Agents) use regular weight, matching the calmer field-value typography.

CANVAS NOTE
- The PBMC usage note is centered directly below the canvas.

SCHOLARLY CITATION RULE
- Every published PBMC gets one stable recommended citation and one generated citation.bib file.
- Recommended citation includes author, year, case title, PBMC snapshot month/year, Platform Generation and canonical URL.
- BibTeX uses a classic @misc record for broad BibTeX compatibility.
- BibTeX includes author, title, howpublished, year, month, URL, snapshot note and CC BY 4.0 license.
- The page provides Copy citation, Copy BibTeX and Download .bib.
- Citation data comes from reuse.citation_data so future cases can support different authors if needed.

FUTURE YOUTUBE PUBLICATION
- A YouTube URL may be stored before the video becomes public.
- The PBMC page is generated with the video card immediately.
- Thumbnail/click availability before publication depends on YouTube visibility.
- No PBMC rebuild is required when YouTube later publishes the same video URL.

CANVAS HEADER BRANDING v2.14
- The case/platform name is rendered dynamically inside the canvas at top-left.
- Created by + official Platform Generation logo remains top-right with more breathing room from the border.
- Field values, actor names and CVU use font weight 500 (medium), not 400 and not title-bold.
- Small field labels remain light/subtle.

COPY SCRIPT FIX v2.15
- Fixed a generated JavaScript syntax error caused by newline/tab escape handling.
- Copy table, Copy citation and Copy BibTeX now share one robust copy helper.
- The primary path uses navigator.clipboard on HTTPS; document.execCommand is the fallback.
- On successful copy, the clicked button temporarily reads 'Kopiert ✓'.
- Generated inline JavaScript is syntax-checked before release.

MOBILE EXPERIENCE v2.16
- Desktop layout is unchanged.
- On phones the canvas first appears as a full overview.
- Explore canvas opens the existing interactive SVG in a full-screen viewer.
- Full-screen viewer supports + / - / Reset, scrolling/panning and two-finger pinch zoom.
- PBMC fields, actors and CVU support tap tooltips on touch devices.
- Touch tooltips render as a bottom information sheet.
- The website header gets a hamburger menu below 1000px.
- PBMC Data remains a true comparison table; Perspective and Field stay sticky while horizontally scrolling on phones.

WHITE CANVAS INTERIOR v2.17
- The area inside the PBMC outer frame is pure white.
- The surrounding canvas-stage remains warm light grey so the PBMC frame is still visually distinct.

OFF-WHITE FIELD FILL v2.18
- Default PBMC field cards use a soft warm off-white fill (#faf8f3).
- The canvas interior stays pure white.
- Hover states still switch to the perspective color.

MULTI-CASE LIBRARY v2.19
- Case 001: Scalable Capital.
- Case 002: SHEIN, generated from Platform_Generation_SHEIN_PBMC_Content_v3_FROZEN.
- Case 003: akippa, generated from Platform_Generation_Akippa_IPO_PBMC_Content_v1_FROZEN.
- Search/autocomplete and cyclic Previous/Next navigation are generated from library.json.
- Snapshot month/year is generated from metadata.snapshot_date; it is no longer hard-coded.
- SHEIN uses the workbook's BASE on-demand-platform boundary for its library snapshot.
- akippa uses the workbook's current BASE state with Owner Mode as Provider access.

CASE VIDEO LINKS v2.20
- SHEIN: https://www.youtube.com/watch?v=Ylpyi3P9WC4
- akippa: https://www.youtube.com/watch?v=n88gS8-AsAU
- Both cases now render the automatic clickable YouTube thumbnail section below the PBMC canvas.

PASTEL PERSPECTIVE FIELDS v2.21
- Canvas interior remains pure white.
- Owner fields: #F1F6FF (very light blue).
- Provider fields: #FFF9EA (very light warm yellow/off-white).
- Consumer fields: #FFF2EC (very light orange).
- Partner fields: #F0F8F2 (very light green).
- Core Value Unit: #F2F2F0 (neutral light grey).
- Existing role-colored borders remain unchanged.
- Hover states continue to use the saturated role color with white text.

FLOW LABELS + FOCUS v2.22
- Flow label coordinates are no longer case-specific.
- Labels are automatically placed beside latter route segments.
- Candidate positions are scored against PBMC fields, CVU, other active routes and already placed labels.
- This keeps labels off their own transaction line whenever a clean candidate is available.
- Flow routes have an invisible larger hover target for usability.
- Hovering a route or label renders that route as a solid, stronger foreground overlay and dims the other flows.
- On touch devices, tapping a flow route or label provides the same focus state.

SHEIN DISPLAY NAME FIX v2.23
- VO-oriented spellings such as 'she in' are preserved only in the original FROZEN production workbook.
- Website case data, explanations, hover text and generated static HTML use the official brand spelling SHEIN.

CASE 004 OPENROUTER v2.24
- Added OpenRouter as Case 004 from the supplied Platform Generation presentation.
- Snapshot boundary: OpenRouter remains Owner and Stripe is the existing financial Partner at the acquisition announcement.
- The announced acquisition is handled in the headline, explanations and Platform Lesson rather than prematurely rendering Stripe as current Owner.
- YouTube: https://www.youtube.com/watch?v=0wIRdTYDitc
- Library order: Scalable Capital -> SHEIN -> akippa -> OpenRouter -> Scalable Capital.

CASE 005 WALMART MARKETPLACE v2.25
- Generated from the supplied PBMC_10_walmart.pptx structure.
- Canvas roles normalized to Walmart / Shoppers / Sellers / Service Partners for readability.
- Explanation text developed editorially from the supplied PBMC fields and verified against Walmart primary sources.
- Advertising spend normalized to the seller/advertiser side rather than Consumer spend.
- No YouTube URL is set, so the video section remains absent.
- Library order: Scalable Capital -> SHEIN -> akippa -> OpenRouter -> Walmart Marketplace -> Scalable Capital.

RUNTIME LIBRARY INDEX v2.26
- One-time migration: all existing case pages now load ../library.json at runtime.
- Search/autocomplete and cyclic Previous/Next navigation are no longer embedded per case.
- The root index also reads library.json at runtime to find the first published case.
- library.json is the single runtime source for published-case discovery and ordering.
- After v2.26, a normal NEW CASE deployment needs only library.json plus the new case folder.
- New case folder: case.json, index.html, pbmc-data.csv and citation.bib.
- Existing case HTML is only uploaded again when shared design, renderer or page-template code changes.

OPEN USE + ATTRIBUTION v2.31
- Replaces the defensive v2.29 'protected framework' language with a Strategyzer-like open-use model.
- Case data: CC BY 4.0.
- PBMC canvas/template: CC BY-SA 4.0.
- Reproduction, teaching, consulting and adaptation are explicitly allowed.
- Attribution must remain visible; adapted versions use 'Adapted from the Platform Business Model Canvas (PBMC)...'.
- Unmodified Official PBMCs should retain displayed provenance rather than having it removed/replaced.
- Adapted versions may carry other branding but cannot be presented as Official PBMC.
- Platform Generation logos and Official PBMC designation remain outside the Creative Commons licenses.
- Canvas provenance now includes a textual author/domain line in addition to the Platform Generation logo.
