R.I.S.E. Index™ one-item-per-page latency build

Purpose
- Adapts the adult research inventory to the one-statement-at-a-time interaction used by https://research.renfaut.org/teen/.
- Measures each scored item from item display to the participant's first response.
- Adds one required research variable: English Reading Comfort.
- Keeps the existing longstring warning / second-run termination logic.
- Speed warnings are intentionally disabled during calibration. Raw per-item latency is collected so item-specific thresholds can be estimated from clean one-page data.

Data isolation
- The included Apps Script receiver writes to a NEW sheet named: Latency Per-Page
- This prevents mixing the earlier multi-item-page latencies with the new page-display-to-click latencies.
- The receiver starts with the complete Verification column order, then appends per-page/language/latency extensions.

Deployment order
1. In the Apps Script project used for latency testing, replace the receiver code with latency_per_page_receiver.gs.
2. Deploy/update the Web App. If the Web App URL changes, update latency/js/config.js.
3. Upload the contents of the included latency/ folder to the research site's /latency/ folder, or to a temporary test folder if preferred.
4. Run one clean test and confirm a new Latency Per-Page tab is created and includes English Reading Comfort, Interface Version, item-level latency, timing JSON, and quality fields.
5. Confirm completion codes/profile flow only appear after the receiver posts an explicit success message.

Language question
“How comfortable are you reading and understanding professional or academic material in English?”
Options: Very comfortable / Comfortable / Somewhat comfortable / Not very comfortable.
This variable is for research only and does not alter scoring.

Important
The scoring/profile files are carried forward unchanged from the current latency build. This package changes presentation, timing measurement, and research metadata; it does not intentionally revise the R.I.S.E. scoring specification.
