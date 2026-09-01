# PBMC Library v2.62 Arrow Geometry Audit

## Global transaction-arrow rule

Every transaction arrow must satisfy all four constraints:

1. It starts and ends only on a **short edge** of the relevant Transaction field.
2. Anchor points are **distributed along the short edge**, rather than all collapsing into its midpoint.
3. The complete route has **at most two corners / bends**.
4. The first segment leaves the start edge **perpendicularly** and the final segment meets the destination edge **perpendicularly**.

For horizontal Owner/Partner Transaction boxes, this means the first/final segment at the field is horizontal.
For vertical Provider/Consumer Transaction boxes, this means the first/final segment at the field is vertical.

## Distributed anchors

- Owner: left y = 228 / 246 / 264; right y = 228 / 246 / 264
- Provider: top x = 334 / 361 / 388; bottom x = 334 / 361 / 388
- Consumer: top x = 1052 / 1079 / 1106; bottom x = 1052 / 1079 / 1106
- Partner: left y = 672 / 690 / 708; right y = 672 / 690 / 708

## Route QA

- 12/12 directed role-pair routes use short-edge anchors only.
- 12/12 routes use distributed anchors.
- 12/12 routes have no more than two bends.
- 12/12 routes leave and meet the Transaction field perpendicularly.
- 27/27 current case pages rebuilt with renderer v18.6, including Depop 027.
