R.I.S.E. INDEX - LATENCY BUILD

This folder is a standalone test build for the research site.

Submission target:
https://script.google.com/macros/s/AKfycbwDNMWUsFyyd6aY2_pbaifLJGkj-x0RN4N0XfNNzPsYJop_oSOFrfz7QEfJLrQGSTFW/exec

Data target:
Google Sheet tab: Latency

Latency collection includes:
- Q01-Q81 adjusted first-response latency
- active/inactive time
- response changes and answer order
- browser visibility events
- page_transition_start/end events
- attention_check_start/end events
- quality_warning_start/end events
- review_mode_start/end events

Time spent in page transitions, attention checks, the quality-warning modal,
and response-review mode is excluded from scored-item latency so those interface
activities do not inflate the next R.I.S.E. item's response time.

The index page uses normal R.I.S.E. Index research wording and does not display
"Begin Latency Test".
