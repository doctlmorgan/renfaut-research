# R.I.S.E. Index™ Teen / Student Pilot Site

## Files
- `index.html` — student landing page using the two supplied student silhouettes.
- `rise.html` — one-question-per-screen 45-item youth pilot with auto-advance, Back, session-only state, and long-string warning/termination.
- `profile.html` — completion/result page.
- `js/teen-spec.js` — 45 youth stems mapped to permanent master-pool item numbers.
- `js/teen-inventory.js` — inventory interaction and response-quality logic.
- `js/teen-profile.js` — archetype-card resolver.
- `css/teen.css` — Renfaut-aligned responsive styling.

## Archetype card assets
Copy the eight approved SVGs into `assets/cards/` using these exact names:

- teen-accelerator-card-brand.svg
- teen-advocate-card-brand.svg
- teen-architect-card-brand.svg
- teen-catalyst-card-brand.svg
- teen-connector-card-brand.svg
- teen-cultivator-card-brand.svg
- teen-sensemaker-card-brand.svg
- teen-stabilizer-card-brand.svg

Preview a card before youth scoring is enabled with, for example:
`profile.html?demo=connector`

## Youth scoring
`SCORING_ENABLED` is intentionally `false` in `js/teen-inventory.js`.
The current adult N=155 thresholds are included only as a code reference and are not used. Turn scoring on only after youth thresholds are approved.

## Storage
In-progress responses use `sessionStorage` only. Starting from the landing page clears any previous in-progress student attempt. Completion clears the in-progress state.

## Response-quality rule
The long-string threshold is 10 identical first-time responses, matching the existing research verification build. The first event generates a review warning; a second qualifying event terminates the attempt. No separate attention-check item is included.

## Submission endpoint
No production submission endpoint is wired into this package yet. Add the approved student-pilot writer when the destination/schema is finalized.
