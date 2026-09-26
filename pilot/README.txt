R.I.S.E. Index™ — Leadership Inventory Pilot
=============================================

FILES
-----
index.html  — the pilot website
Code.gs     — Google Apps Script Web App receiver for the Inventory Pilot sheet

WHAT IS BUILT
-------------
• Renfaut-branded pilot interface using the current Luminal Palette and Aptos type system.
• One statement per screen.
• Automatic advance after the first response to a statement.
• Back navigation; changing a response while revisiting does not auto-advance.
• Visual progress bar.
• 30 experimental R.I.S.E. items in a mixed fixed order with principle labels hidden.
• Two attention checks, inserted after scored items 10 and 21.
• Straight-line warning after 8 consecutive identical scored responses.
• Item-level response latency capture.
• One-tab data architecture targeting the Google Sheet tab named “Inventory Pilot”.
• No profile, archetype, or scored interpretation is shown to participants.

GOOGLE SHEET
------------
Spreadsheet ID already configured:
1nRRl3Ul2vsEkd0aU7Z57JPikBoy9Kh1_kAe5Dirn7IQ

Tab:
Inventory Pilot

IMPORTANT: the one-tab setup script discussed in ChatGPT should be run first so that the required headers exist. The receiver will write only to headers that exist.

DEPLOY THE RECEIVER
-------------------
1. Open the Apps Script project associated with the pilot.
2. Keep your existing one-tab setup/analysis code.
3. Add the contents of Code.gs to that same Apps Script project (or merge in the doGet/doPost functions).
4. Save.
5. Click Deploy > New deployment.
6. Select Web app.
7. Execute as: Me.
8. Who has access: Anyone.
9. Deploy and copy the Web App URL ending in /exec.

CONNECT THE WEBSITE
-------------------
Open index.html in a text editor and find:

const SUBMIT_URL = 'PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

Replace only the placeholder text with the deployed /exec URL.

HOSTING
-------
The site is static and can be hosted wherever the current Renfaut research site is hosted. It relies on the approved Renfaut logo assets hosted at renfaut.org.

BRAND NOTES
-----------
The site follows the Renfaut Visual Identity Guide v1.1: Aptos/Aptos Display; Luminal colors; restrained single-accent use in the assessment interface; official Renfaut and R.I.S.E. logo assets; and no claims beyond the experimental pilot specification.

DATA NOTES
----------
Responses are stored as 1–4 numeric values:
1 Not at all like me
2 Not much like me
3 Somewhat like me
4 Very much like me

AC1 correct answer = 2
AC2 correct answer = 4

Latency values are written to the sheet in seconds.


DEMOGRAPHIC UPDATE
------------------
The pilot now collects only four participant demographics: Age, Race or racial identity, Gender, and Country. Prior participant identifier, role/title, sector, leadership experience, supervisory responsibility, and prior R.I.S.E. participation fields were removed from the participant-facing pilot. The Apps Script receiver automatically adds Age, Race, Gender, and Country columns to the Inventory Pilot tab if they are missing.

After replacing Code.gs in Apps Script, deploy a NEW VERSION of the existing Web App deployment so the current /exec endpoint uses the updated receiver.

Updated participant fields: Participant Identifier, Age, Race, Gender, Country, and Leadership Experience.
