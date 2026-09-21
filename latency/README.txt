R.I.S.E. INDEX™ LATENCY TEST SITE

Purpose
-------
This folder is a self-contained test environment for evaluating item-level response latency before any latency tracking is deployed to the live R.I.S.E. research site.

Endpoint
--------
https://script.google.com/macros/s/AKfycbxiiyKpHlGCQnTycvqAvYNo-cfhBUhPHxdTRzDiQrJf6kg-1BGH3MX9dukLTs2CI2_b/exec

Destination sheet tab
---------------------
Latency

Files
-----
index.html
rise.html
profile.html
js/rise-spec.js
js/scoring-engine.js
js/profile.js
js/latency.js

Latency behavior
----------------
- Q01-Q81 first-response latency is measured in ACTIVE browser time.
- Time while the tab is hidden is excluded from item latency and tracked separately.
- Response changes are counted and retained as timing events, but do not replace the first-response latency.
- Attention checks are not included in Q01-Q81 latency summaries.
- Raw answer order, visibility changes, and timing events are retained for later analysis.
- Existing verification quality-warning and termination behavior remains active.

Testing
-------
Upload this folder as /latency/ within the research site.
Open /latency/index.html or /latency/rise.html.
Confirm submissions appear only in the Latency sheet tab.
Do not link this test build from the production research landing page.
