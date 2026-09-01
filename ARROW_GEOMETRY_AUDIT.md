# PBMC Library v2.59 Arrow Geometry Audit

Purpose: update the shared transaction-arrow geometry for all current PBMC cases.

Rule
- Transaction arrows may only start or end on a SHORT edge of the relevant Transaction field.
- Anchor points are distributed along that short edge instead of all meeting at the center.

Distributed anchors
- Owner transaction: left y = 228 / 246 / 264; right y = 228 / 246 / 264
- Provider transaction: top x = 334 / 361 / 388; bottom x = 334 / 361 / 388
- Consumer transaction: top x = 1052 / 1079 / 1106; bottom x = 1052 / 1079 / 1106
- Partner transaction: left y = 672 / 690 / 708; right y = 672 / 690 / 708

Directed routes verified
- owner>provider, provider>owner
- owner>consumer, consumer>owner
- owner>partner, partner>owner
- provider>consumer, consumer>provider
- provider>partner, partner>provider
- consumer>partner, partner>consumer

QA summary
- 12/12 directed routes verified against short-edge-only anchors
- 26/26 case pages rebuilt with the shared renderer update
