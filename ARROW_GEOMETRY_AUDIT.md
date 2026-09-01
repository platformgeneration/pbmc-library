# PBMC Library v2.65 Arrow / Label Geometry Audit

Rules
- Transaction arrows start/end only on the short Transaction edges.
- Short-edge anchors remain distributed.
- Arrows remain perpendicular to those edges at departure/arrival.
- Each route has at most two bends.
- Flow labels must be in white space and may not overlap PBMC fields, actors or CVU.
- Labels must remain close to their own route so the visual association stays obvious.

Renderer v18.9
- Difficult owner↔partner labels now use route-attached parking positions beside the lower horizontal route segments.
- partner→owner parks at (1035,742), directly beside its own lower green segment and outside the Partner/Consumer fields.
- owner→partner parks at (405,742), directly beside its own lower blue segment and outside the Partner/Provider fields.
- The normal automatic collision checks remain active.

QA
- 27/27 case pages rebuilt.
