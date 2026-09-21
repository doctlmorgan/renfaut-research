R.I.S.E. Index latency build v5

Changes in v5:
- Attention-check timing starts only on direct interaction, not visibility.
- Scored-item timing baseline resets after each attention check.
- Review-mode timing ends when the next new scored item becomes visible; baseline resets before timing resumes.
- Completion screen shows: Passed or Passed after review.
- Termination screen shows: Response quality check: Not passed.
- User-facing latency-test wording removed from termination messages.
