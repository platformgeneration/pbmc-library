Platform Generation About update — 15 September 2026

Home remains the PBMC Library from the user's uploaded pbmc-library-main.zip.
The root index, case contents, canvases, search/browse controls, case order,
official logos, existing site.css, renderer assets, and footers are unchanged.

New route: about/index.html. It opens with a personal, informal explanation of
Platform Generation and the PBMC. Three sections follow: Research & ideas,
Videos & writing, and Elsewhere on the web. The FortisBC whitepaper, Google
Scholar, ORCID, YouTube, Medium, Substack, personal website, LinkedIn and a
curated list of independent platform researchers appear there. The list links
names to selected work, with more people in an expandable section. The supplied
FortisBC cover is stored locally as assets/fortisbc-cover.png from the user's
uploaded file. about.css uses
the official brand colors and logo but does not modify case styles.

The menu on case pages and About is Canvas · PBMC Library · About. On a case,
Canvas points to its PBMC and Library points to the existing Library root;
About points to the new route. On About, Canvas points to the current first
case's PBMC. The Research & ideas section lives within About. No research
sections are appended to cases.
build.py writes those destinations for future cases and preserves the existing
StockX page because the uploaded master has no stockx/case.json.

For the existing GitHub repository, use the accompanying small github-patch ZIP
and follow GITHUB_UPLOAD_INSTRUCTIONS.txt. This full master archive can be used
when the repository matches the uploaded master exactly. No IONOS or GitHub
Pages settings are changed by this archive. The FortisBC PDF still lives on
the current website's CDN; move it to durable hosting controlled by Platform
Generation before retiring the old website.
