R.I.S.E. INDEX RESEARCH VERIFICATION BUILD

Purpose
-------
This folder is a test build intended to be uploaded as /verification/ inside research.renfaut.org.
It does not replace the live research site until testing is complete.

Verification receiver
---------------------
https://script.google.com/macros/s/AKfycbyv7FMpUyCJtcqNyQQsFJS3f2OopGizL5XKc_PPTBc9eFa6D0oz7nrPM0AR25Tm8JdoGA/exec

Expected path
-------------
https://research.renfaut.org/verification/

Key verification behaviors
--------------------------
1. All submissions go to the Apps Script Verification receiver and the Verification sheet tab.
2. Active and inactive time are recorded beginning when Start Inventory is selected.
3. Three embedded instruction checks look visually like ordinary R.I.S.E. statements.
4. A provisional long-string threshold of 10 identical consecutive first-time scored responses triggers the first warning.
5. The first warning asks the participant to review recent responses. Review edits are counted.
6. A second long-string pattern of 10 identical consecutive first-time scored responses ends the verification inventory.
7. During verification, terminated response vectors are intentionally retained in the Verification tab so the rule can be audited before any production exclusion behavior is activated.
8. Server-side Apps Script independently calculates Max Longstring and dominant-response metrics.

Important
---------
LONGSTRING_THRESHOLD = 10 is provisional and should not be treated as a validated production cutoff yet.
The warning/termination interface is an extension for verification testing; it is not an established Renfaut visual standard.

Brand basis
-----------
The build preserves the existing Luminal palette, Aptos/Aptos Display typography, Renfaut masterbrand hierarchy, and participant-facing digital design principles from the July 2026 Renfaut Visual Identity Guide v1.1.
