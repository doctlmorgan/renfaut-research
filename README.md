# Renfaut Research

Participant-facing research and validation environment for the R.I.S.E. Index™.

## Current calibration

- Sample: N = 155
- Boundary rule: High = score > cut score
- RR: 73.33
- IB: 71.15
- DE: 78.33
- ES: 83.33
- RA: 86.11

## Site flow

`index.html` → `rise.html` → `profile.html` → optional exploration of `renfaut.org`

The pre-inventory experience intentionally avoids detailed explanations of the five principles to reduce construct priming.


## Research form integration (2026-09-15)

The participant-facing inventory posts to the dedicated research Google Form. A required Participant Identifier is stored in `entry.1185653219`. Participants create a 6–20 character code using letters, numbers, or hyphens and are instructed not to use direct identifying information. The identifier is stored with the local Leadership Profile and displayed after submission so it can be retained for later result requests.

Research demographic mappings used by the site include age (`entry.1022132287`), country (`entry.984504931`), race/ethnicity (`entry.1285176183`), gender (`entry.1083444680`), role (`entry.850283824`), sector (`entry.372153283`), years in leadership (`entry.1692425384`), contact consent (`entry.1084504372`), email (`entry.912272113`), and optional name (`entry.723280880`).


Version 4 updates: monochrome research landing treatment; country dropdown; removed contact-consent choice; optional email now indicates contact preference.

## Apps Script response writer
The website now posts to the deployed Google Apps Script web app and waits for a `postMessage` success signal before showing the completion confirmation. Use `research-writer.gs` as the Apps Script code for the deployed web app, then update the existing deployment to a new version. The `/exec` URL configured in `rise.html` is:

https://script.google.com/macros/s/AKfycbwQK1upfemXMccIEnarPyog3UCwe7eD65dZvWYmN6lVWCR_ReykRDHZ6pGXnXp6EqGl/exec

The response sheet stores metadata followed by Q01-Q81 and ATTN01-ATTN02 in separate columns.
