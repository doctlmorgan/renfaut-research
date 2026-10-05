R.I.S.E. Index - Randomized One-Item-Per-Page Research Build
Version: one-item-per-page-randomized-v3-progress

WHAT CHANGED IN V3
- Preserves the randomized one-item-per-page design, item-level latency, periodic-pattern warning, straightline warning/termination logic, scoring, and Leadership Profile.
- Creates an Administration ID when the participant selects Start Inventory.
- Immediately saves an in-progress row after Start Inventory.
- Updates that SAME row after every 10 newly answered scored items rather than creating duplicate rows.
- Makes a best-effort checkpoint when the tab is hidden or the page is closed.
- Final completion or quality termination updates the same administration row to completed or terminated.
- Adds an hourly cleanup option that relabels stale in-progress records as incomplete after 120 minutes without a newer checkpoint.
- Partial responses remain available for attrition and response-process analysis.

NEW TRAILING DATA FIELDS
Administration ID
Administration Status
Items Completed
Last Answered Display Position
Last Checkpoint At
Submission Type
Incomplete Marked At

STATUS VALUES
in_progress  = participant started but has not completed or been terminated
completed    = participant completed and submitted the inventory
terminated   = administration ended under the existing response-quality rule
incomplete   = in-progress administration became stale and was relabeled by the cleanup trigger

CHECKPOINT BEHAVIOR
- Start Inventory: saves 0 completed items.
- Every 10 scored items: updates the same row (10, 20, 30, etc.).
- Warning events: also force a checkpoint.
- Page/tab exit: best-effort checkpoint; browser/network conditions can prevent this final exit write.
- Because the Start write happens immediately, even an immediate dropout can still be represented if that initial request reaches Apps Script.

CONSENT
The inventory consent now states that if a participant begins but does not finish, partial responses may be retained for research on completion and response patterns. It does not tell participants that response time is being measured.

GOOGLE APPS SCRIPT ENDPOINT
https://script.google.com/macros/s/AKfycbz7tqhGNAURZoUj7tuS-SkNzfgGOTGpH1VUHKiAX-7o0FokiP0HXczu9z6CF-YGGA66sQ/exec

RECEIVER / SHEET
The receiver continues to write to the existing "Latency Per-Page" tab. New progress-tracking fields are appended at the end, so existing columns are not reordered. Existing older rows remain valid and simply have blank Administration ID/progress fields.

DEPLOYMENT
1. Replace the Apps Script code with latency_per_page_randomized_receiver.gs.
2. Save Apps Script.
3. Run setupIncompleteCleanupTrigger() ONCE from the Apps Script editor and authorize it. This creates an hourly cleanup trigger.
4. Deploy > Manage deployments > Edit > New version > Deploy. Keep the same web-app /exec URL.
5. Replace the randomized website files with this package (at minimum rise.html, js/config.js, and js/per-page-inventory.js; using the full package is safest).

VERIFICATION
A. Run testProgressUpsert() in Apps Script. It should create ONE row, then update that same row to Items Completed=10.
B. In the browser, start a test administration, answer 3-7 scored items, and close the tab. Confirm the row exists with Administration Status=in_progress and partial responses. The exact Items Completed value may reflect the latest successful checkpoint; the page-exit checkpoint is best effort.
C. Complete a test normally. Confirm that the same Administration ID row changes to Administration Status=completed, Items Completed=81, and contains the full timing/presentation data.
D. The stale cleanup runs hourly. An in-progress row with no newer checkpoint for 120 minutes will be marked incomplete and receive Incomplete Marked At.

IMPORTANT
- Start/checkpoint writes are background saves and do not interrupt the participant.
- Final submission still waits for the explicit Apps Script success message before showing completion.
- Presentation Order JSON remains essential and unchanged.
- Canonical Q01-Q81 columns and scoring remain unchanged.
- The page-exit save is useful but cannot be guaranteed by any browser; the immediate Start save and 10-item checkpoints are the primary protection against missing dropout data.
