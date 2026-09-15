PBMC Library v2.91 — minimal case navigation
2026-09-15

Changes from v2.90:
- Removed Case number and Snapshot date from the visible tag pills to reduce visual clutter.
- Replaced the large Previous / Search / Next controls next to the tags with a tiny toolbar directly above the canvas, aligned right:
  ←  search icon  →
- Search expands only when the magnifying-glass icon is clicked.
- Previous / Next remain keyboard- and screen-reader-accessible links with titles/ARIA labels.
- Orange title dropdown indicator retained and made explicit.
- Mobile uses the same minimal toolbar with compact dimensions.
- Existing bottom Previous / Next case navigation remains unchanged for long-page navigation.
- build.py updated so future generated cases use the same layout.
