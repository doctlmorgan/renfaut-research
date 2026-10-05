R.I.S.E. Index - Randomized One-Item-Per-Page Research Build
Version: one-item-per-page-randomized-v2

WHAT CHANGED IN V2
- Keeps the existing straightline rule unchanged: 10 identical scored responses triggers the current warning; a second 10-response run under the existing logic can terminate the administration.
- Adds participant-facing detection of exact repeating response cycles with pattern lengths 2 through 6.
- A periodic-pattern warning is triggered only when an exact cycle spans at least 12 consecutive scored responses.
  Examples: a 2-response cycle repeated 6 times; a 4-response cycle repeated 3 times.
- Straightlines are excluded from the periodic detector because they are handled by the existing longstring detector.
- Attention checks are excluded from periodic-pattern calculations and do not interrupt the scored-response sequence.
- Periodic patterns receive a review warning but DO NOT terminate the inventory in this version.
- The same uninterrupted periodic episode is not warned repeatedly. A later separate periodic episode can generate another warning.
- The warning sends the participant back to review the recent pattern with answers preserved.
- Presentation Order JSON remains recorded and canonical Q01-Q81 storage/scoring is unchanged.

NEW TRAILING DATA FIELDS
Pattern Repetition Detected
Pattern Length
Pattern Repetitions
Pattern Start Position
Pattern End Position
Maximum Pattern Repetitions
Pattern Warning Count

The receiver also calculates the strongest qualifying periodic pattern from the final submitted responses in presentation order. This provides a final-data check even if the participant changed responses during review.

FILES
index.html
rise.html
profile.html
js/config.js
js/rise-spec.js
js/scoring-engine.js
js/latency.js
js/per-page-inventory.js
js/profile.js
latency_per_page_randomized_receiver.gs

GOOGLE APPS SCRIPT ENDPOINT
https://script.google.com/macros/s/AKfycbzfuWOA7zbg9b8fO5XtxAcguGCh2rzv72rQnPQWeJks2CKekQ2f8t3qYRBeZSdqvuhF/exec

RECEIVER / SHEET
The receiver continues to write to the existing "Latency Per-Page" tab. The seven new periodic-pattern fields are appended after Presentation Order JSON, so existing columns do not need to be reordered.

DEPLOYMENT
1. Replace the current randomized site files with this package (at minimum rise.html, js/config.js, js/per-page-inventory.js; the full package is safest).
2. Replace the Apps Script receiver code with latency_per_page_randomized_receiver.gs.
3. Save Apps Script, then Deploy > Manage deployments > Edit > New version > Deploy so the existing /exec URL serves the updated code.
4. Run testPeriodicPatternDetector() in Apps Script if you want to verify the server-side detector before a live submission.
5. Submit controlled browser tests:
   - irregular responses: no periodic warning;
   - alternating two-response pattern for 12 scored items: warning at the 12th scored response;
   - four-response cycle repeated 3 times: warning at the 12th scored response;
   - 10 identical responses: existing straightline warning;
   - 20 identical responses: existing straightline termination behavior.
6. Confirm the seven new columns are appended to Latency Per-Page and Presentation Order JSON still contains 81 unique canonical Q IDs.

DESIGN
The update preserves the existing Renfaut research interface and its one-action-at-a-time assessment design. No scoring, profile, item wording, or principle presentation was changed.
