// ============================================================
// R.I.S.E. Index™ — Leadership Inventory Pilot
// Google Apps Script Web App Receiver
// Writes to ONE tab: Inventory Pilot
// ============================================================

const PILOT_SPREADSHEET_ID = '1nRRl3Ul2vsEkd0aU7Z57JPikBoy9Kh1_kAe5Dirn7IQ';
const PILOT_SHEET_NAME = 'Inventory Pilot';

const PILOT_RISE_ITEMS = [
  'RR1','RR2','RR3','RR4','RR5','RR6',
  'IB1','IB2','IB3','IB4','IB5','IB6',
  'DE1','DE2','DE3','DE4','DE5','DE6',
  'ES1','ES2','ES3','ES4','ES5','ES6',
  'RA1','RA2','RA3','RA4','RA5','RA6'
];

function doGet() {
  return ContentService
    .createTextOutput('R.I.S.E. Index Leadership Inventory Pilot receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.parameter && e.parameter.payload) || '{}');
    const ss = SpreadsheetApp.openById(PILOT_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PILOT_SHEET_NAME);
    if (!sheet) throw new Error('Inventory Pilot tab not found. Run setupInventoryPilot first.');

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const row = new Array(headers.length).fill('');
    const put = (header, value) => {
      const i = headers.indexOf(header);
      if (i >= 0) row[i] = value === undefined || value === null ? '' : value;
    };

    put('Response ID', payload.responseId);
    put('Timestamp', payload.timestamp || new Date().toISOString());

    PILOT_RISE_ITEMS.forEach(id => put(id, payload.answers ? payload.answers[id] : ''));
    put('AC1', payload.answers ? payload.answers.AC1 : '');
    put('AC2', payload.answers ? payload.answers.AC2 : '');
    put('ITEM_ORDER', payload.itemOrder || '');
    put('Inventory Start Time', payload.inventoryStartTime || '');
    put('Inventory End Time', payload.inventoryEndTime || '');
    put('Total Duration Seconds', payload.totalDurationSeconds || '');

    PILOT_RISE_ITEMS.forEach(id => {
      const ms = payload.latenciesMs ? payload.latenciesMs[id] : '';
      put('LAT_' + id, ms === '' ? '' : Number(ms) / 1000);
    });
    ['AC1','AC2'].forEach(id => {
      const ms = payload.latenciesMs ? payload.latenciesMs[id] : '';
      put('LAT_' + id, ms === '' ? '' : Number(ms) / 1000);
    });

    put('Straightline Warning Shown', payload.straightlineWarningShown || 'No');
    put('Straightline Warning Count', payload.straightlineWarningCount || 0);
    put('Device Type', payload.deviceType || '');
    put('User Agent', payload.userAgent || '');

    // Optional participant-context columns if they exist in the sheet.
    const p = payload.participant || {};
    put('Participant Identifier', p.participantIdentifier || '');
    put('Country', p.country || '');
    put('Professional Role or Title', p.role || '');
    put('Primary Sector', p.sector || '');
    put('Leadership Experience', p.leadershipExperience || '');
    put('Supervisory Responsibility', p.supervisoryResponsibility || '');
    put('Previous R.I.S.E. Participation', p.priorRiseParticipation || '');

    sheet.appendRow(row);

    // If the one-tab analysis function exists in this project, run it immediately.
    if (typeof analyzeInventoryPilot === 'function') {
      analyzeInventoryPilot();
    }

    return ContentService
      .createTextOutput(JSON.stringify({ok:true,responseId:payload.responseId || ''}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok:false,error:String(err && err.message ? err.message : err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
