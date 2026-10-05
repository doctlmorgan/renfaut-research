/*************************************************************************
 * R.I.S.E. INDEX - ONE-ITEM-PER-PAGE LATENCY RECEIVER
 *
 * PURPOSE
 * -------
 * TEST / VERIFICATION receiver for item-level response latency.
 *
 * It does NOT replace the current production receiver.
 * It does NOT write to "Research Website Responses".
 * It does NOT write to "Verification".
 *
 * All submissions sent to this Web App are written to:
 *
 *     Latency Per-Page
 *
 * The receiver preserves the existing verification fields and adds:
 * - active / inactive time
 * - per-item latency for Q01-Q81
 * - timing summaries
 * - answer-change counts
 * - answer-order JSON
 * - raw timing-event JSON
 * - browser visibility-event JSON
 * - start/checkpoint/final upserts for incomplete-administration tracking
 *************************************************************************/


/*************************************************************************
 * CONFIGURATION
 *************************************************************************/

const SPREADSHEET_ID =
  '1nRRl3Ul2vsEkd0aU7Z57JPikBoy9Kh1_kAe5Dirn7IQ';

const SHEET_NAME =
  'Latency Per-Page';

const SCRIPT_VERSION =
  'latency-per-page-randomized-v3-progress';

const INCOMPLETE_AFTER_MINUTES =
  120;


/*************************************************************************
 * MAIN WEB APP ENTRY POINT
 *************************************************************************/

function doPost(e) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const data =
      parsePayload_(e);

    const sheet =
      getLatencySheet_();

    const headers =
      getHeaders_();

    ensureHeaders_(
      sheet,
      headers
    );

    const row =
      buildRow_(
        data,
        headers
      );

    const writeResult =
      upsertAdministration_(
        sheet,
        headers,
        row,
        data
      );

    SpreadsheetApp.flush();

    return successResponse_(
      data.participantIdentifier || '',
      data.administrationId || '',
      data.submissionType || '',
      data.administrationStatus || '',
      writeResult.rowNumber
    );

  } catch (error) {

    console.error(
      'RISE LATENCY TEST ERROR:',
      error
    );

    return errorResponse_(
      error.message
    );

  } finally {

    try {
      lock.releaseLock();
    } catch (e) {
      // Nothing required.
    }
  }
}


/*************************************************************************
 * PARSE INCOMING PAYLOAD
 *************************************************************************/

function parsePayload_(e) {
  if (!e) {
    throw new Error(
      'No request was received.'
    );
  }

  if (
    e.parameter &&
    e.parameter.payload
  ) {
    return JSON.parse(
      e.parameter.payload
    );
  }

  if (
    e.postData &&
    e.postData.contents
  ) {
    return JSON.parse(
      e.postData.contents
    );
  }

  throw new Error(
    'No payload was provided.'
  );
}


/*************************************************************************
 * GET / CREATE LATENCY SHEET
 *************************************************************************/

function getLatencySheet_() {
  const spreadsheet =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  let sheet =
    spreadsheet.getSheetByName(
      SHEET_NAME
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        SHEET_NAME
      );
  }

  return sheet;
}


/*************************************************************************
 * COLUMN DEFINITIONS
 *************************************************************************/

function getHeaders_() {
  const headers = [
    'Submitted At',
    'Participant Identifier',
    'Start Time',
    'End Time',
    'Elapsed Seconds',
    'Age Range',
    'Country',
    'Professional Role',
    'Sector',
    'Years in Leadership',
    'Gender Identity',
    'Race / Ethnicity',
    'Email',
    'Source',
    'Research Consent'
  ];

  for (let i = 1; i <= 81; i++) {
    headers.push('Q' + String(i).padStart(2, '0'));
  }

  headers.push(
    'ATTN01', 'ATTN02', 'ATTN03',
    'ATTN01 Result', 'ATTN02 Result', 'ATTN03 Result',
    'Active Seconds', 'Inactive Seconds',
    'Quality Warning Count', 'First Warning Item', 'First Warning Type',
    'First Warning Run Length', 'Review Changes', 'Second Warning Item',
    'Second Warning Type', 'Second Warning Run Length',
    'Max Longstring', 'Dominant Response', 'Dominant Response Count',
    'Dominant Response Percent', 'Quality Status', 'Termination Reason',
    'Script Version'
  );

  // Per-page research extensions follow the complete Verification schema.
  headers.push(
    'English Reading Comfort',
    'Interface Version',
    'Speed Warning Count',
    'First Speed Warning Item',
    'Speed Warning Rule',
    'Median Response Latency Ms',
    'Mean Response Latency Ms',
    'Response Latency SD Ms',
    'Response Latency CV',
    'First Half Median Latency Ms',
    'Second Half Median Latency Ms',
    'Fast Responses Under 1s',
    'Fast Responses Under 2s',
    'Fast Responses Under 3s',
    'Longest Fast Sequence Under 2s',
    'Changed Response Count'
  );

  for (let i = 1; i <= 81; i++) {
    headers.push('Q' + String(i).padStart(2, '0') + ' Latency Ms');
  }

  headers.push('Response Timing JSON', 'Answer Order JSON', 'Visibility Events JSON', 'Presentation Order JSON',
    'Pattern Repetition Detected', 'Pattern Length', 'Pattern Repetitions',
    'Pattern Start Position', 'Pattern End Position', 'Maximum Pattern Repetitions',
    'Pattern Warning Count',
    'Administration ID', 'Administration Status', 'Items Completed',
    'Last Answered Display Position', 'Last Checkpoint At', 'Submission Type',
    'Incomplete Marked At');
  return headers;
}

/*************************************************************************
 * ENSURE HEADER ROW EXISTS
 *************************************************************************/

function ensureHeaders_(
  sheet,
  headers
) {

  if (
    sheet.getLastRow() === 0
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([
        headers
      ]);

    sheet.setFrozenRows(1);

    return;
  }

  const existingColumns =
    Math.max(
      sheet.getLastColumn(),
      headers.length
    );

  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        existingColumns
      )
      .getValues()[0];

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    if (
      currentHeaders[i] &&
      currentHeaders[i] !==
        headers[i]
    ) {

      throw new Error(
        'Column mismatch at column ' +
        (i + 1) +
        '. Expected "' +
        headers[i] +
        '" but found "' +
        currentHeaders[i] +
        '".'
      );
    }
  }

  if (
    sheet.getLastColumn() <
    headers.length
  ) {

    const missingHeaders =
      headers.slice(
        sheet.getLastColumn()
      );

    sheet
      .getRange(
        1,
        sheet.getLastColumn() + 1,
        1,
        missingHeaders.length
      )
      .setValues([
        missingHeaders
      ]);
  }
}


/*************************************************************************
 * UPSERT ADMINISTRATION
 *
 * New administrations append one row. Start/checkpoint/final writes for
 * the same Administration ID update that same row so partial attempts do
 * not create duplicate rows.
 *************************************************************************/

function upsertAdministration_(sheet, headers, row, data) {
  const adminId = String(data.administrationId || '').trim();

  if (!adminId) {
    sheet.appendRow(row);
    return { rowNumber: sheet.getLastRow(), action: 'append_legacy' };
  }

  const adminColumn = headers.indexOf('Administration ID') + 1;
  const submittedColumn = headers.indexOf('Submitted At') + 1;
  const statusColumn = headers.indexOf('Administration Status') + 1;
  const checkpointColumn = headers.indexOf('Last Checkpoint At') + 1;

  let rowNumber = findAdministrationRow_(sheet, adminColumn, adminId);

  if (!rowNumber) {
    sheet.appendRow(row);
    return { rowNumber: sheet.getLastRow(), action: 'append' };
  }

  const existing = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const existingStatus = String(existing[statusColumn - 1] || '').toLowerCase();
  const incomingStatus = String(data.administrationStatus || '').toLowerCase();
  const terminal = { completed: true, terminated: true, incomplete: true };

  if (terminal[existingStatus] && !terminal[incomingStatus]) {
    return { rowNumber: rowNumber, action: 'ignored_terminal' };
  }

  const existingCheckpoint = parseDateMs_(existing[checkpointColumn - 1]);
  const incomingCheckpoint = parseDateMs_(data.checkpointTime || '');

  if (
    !terminal[incomingStatus] &&
    existingCheckpoint &&
    incomingCheckpoint &&
    incomingCheckpoint < existingCheckpoint
  ) {
    return { rowNumber: rowNumber, action: 'ignored_stale' };
  }

  if (existing[submittedColumn - 1]) {
    row[submittedColumn - 1] = existing[submittedColumn - 1];
  }

  if (existingStatus === 'incomplete' && incomingStatus === 'completed') {
    const incompleteColumn = headers.indexOf('Incomplete Marked At') + 1;
    if (incompleteColumn > 0) row[incompleteColumn - 1] = '';
  }

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  return { rowNumber: rowNumber, action: 'update' };
}

function findAdministrationRow_(sheet, adminColumn, adminId) {
  if (sheet.getLastRow() < 2) return 0;

  const finder = sheet
    .getRange(2, adminColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(adminId)
    .matchEntireCell(true)
    .findNext();

  return finder ? finder.getRow() : 0;
}

function parseDateMs_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value.getTime();
  }
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/*************************************************************************
 * BUILD RESPONSE ROW
 *************************************************************************/

function buildRow_(
  data,
  headers
) {

  const responses =
    data.responses || {};

  const latency =
    data.latency || {};

  const itemLatencyMs =
    latency.itemLatencyMs || {};

  const race =
    Array.isArray(
      data.race
    )
      ? data.race.join('; ')
      : (
          data.race || ''
        );

  const gender =
    Array.isArray(
      data.gender
    )
      ? data.gender.join('; ')
      : (
          data.gender || ''
        );


  const values = {

    'Submitted At':
      new Date(),

    'Participant Identifier':
      data.participantIdentifier || '',

    'Start Time':
      data.startTime || '',

    'End Time':
      data.endTime || '',

    'Elapsed Seconds':
      valueOrBlank_(
        data.elapsedSeconds
      ),

    'Active Seconds':
      valueOrBlank_(
        data.activeSeconds != null
          ? data.activeSeconds
          : latency.activeSeconds
      ),

    'Inactive Seconds':
      valueOrBlank_(
        data.inactiveSeconds != null
          ? data.inactiveSeconds
          : latency.inactiveSeconds
      ),

    'Age Range':
      data.age || '',

    'Country':
      data.country || '',

    'Professional Role':
      data.role || '',

    'Sector':
      data.sector || '',

    'Years in Leadership':
      data.leadershipYears || '',

    'Gender Identity':
      gender,

    'Race / Ethnicity':
      race,

    'Email':
      data.email || '',

    'Source':
      data.source || '',

    'Research Consent':
      data.consent === true
        ? 'Yes'
        : (
            data.consent || ''
          ),

    'English Reading Comfort':
      data.englishReadingComfort || '',

    'Interface Version':
      data.interfaceVersion || '',

    'Speed Warning Count':
      valueOrZero_(data.speedWarningCount),

    'First Speed Warning Item':
      valueOrBlank_(data.firstSpeedWarningItem),

    'Speed Warning Rule':
      data.speedWarningRule || '',

    'Administration ID':
      data.administrationId || '',

    'Administration Status':
      data.administrationStatus || '',

    'Items Completed':
      valueOrZero_(data.itemsCompleted),

    'Last Answered Display Position':
      valueOrZero_(data.lastAnsweredDisplayPosition),

    'Last Checkpoint At':
      data.checkpointTime || '',

    'Submission Type':
      data.submissionType || '',

    'Incomplete Marked At':
      data.incompleteMarkedAt || ''
  };


  /***********************************************************************
   * Q01-Q81
   ***********************************************************************/

  for (
    let i = 1;
    i <= 81;
    i++
  ) {

    const key =
      'Q' +
      String(i).padStart(
        2,
        '0'
      );

    values[key] =
      responses[key] || '';

    values[
      key + ' Latency Ms'
    ] =
      valueOrBlank_(
        itemLatencyMs[key]
      );
  }


  /***********************************************************************
   * RAW ATTENTION CHECK RESPONSES
   ***********************************************************************/

  values['ATTN01'] =
    responses['ATTN01'] || '';

  values['ATTN02'] =
    responses['ATTN02'] || '';

  values['ATTN03'] =
    responses['ATTN03'] || '';


  /***********************************************************************
   * ATTENTION CHECK RESULTS
   ***********************************************************************/

  values['ATTN01 Result'] =
    data.attentionCheck1 || '';

  values['ATTN02 Result'] =
    data.attentionCheck2 || '';

  values['ATTN03 Result'] =
    data.attentionCheck3 || '';


  /***********************************************************************
   * WARNING INFORMATION
   ***********************************************************************/

  values['Quality Warning Count'] =
    valueOrZero_(
      data.qualityWarningCount
    );

  values['First Warning Item'] =
    valueOrBlank_(
      data.firstWarningItem
    );

  values['First Warning Type'] =
    data.firstWarningType || '';

  values['First Warning Run Length'] =
    valueOrBlank_(
      data.firstWarningRunLength
    );

  values['Review Changes'] =
    valueOrZero_(
      data.reviewChanges
    );

  values['Second Warning Item'] =
    valueOrBlank_(
      data.secondWarningItem
    );

  values['Second Warning Type'] =
    data.secondWarningType || '';

  values['Second Warning Run Length'] =
    valueOrBlank_(
      data.secondWarningRunLength
    );


  /***********************************************************************
   * RESPONSE-PATTERN SUMMARY
   ***********************************************************************/

  const calculatedQuality =
    calculateResponsePattern_(
      responses,
      data.presentationOrder || []
    );

  values['Max Longstring'] =
    data.maxLongstring != null
      ? data.maxLongstring
      : calculatedQuality.maxLongstring;

  values['Dominant Response'] =
    data.dominantResponse ||
    calculatedQuality.dominantResponse;

  values['Dominant Response Count'] =
    data.dominantResponseCount != null
      ? data.dominantResponseCount
      : calculatedQuality
          .dominantResponseCount;

  values['Dominant Response Percent'] =
    data.dominantResponsePercent != null
      ? data.dominantResponsePercent
      : calculatedQuality
          .dominantResponsePercent;


  /***********************************************************************
   * LATENCY SUMMARY
   ***********************************************************************/

  values['Median Response Latency Ms'] =
    valueOrBlank_(
      latency.medianResponseLatencyMs
    );

  values['Mean Response Latency Ms'] =
    valueOrBlank_(
      latency.meanResponseLatencyMs
    );

  values['Response Latency SD Ms'] =
    valueOrBlank_(
      latency.responseLatencySdMs
    );

  values['Response Latency CV'] =
    valueOrBlank_(
      latency.responseLatencyCv
    );

  values['First Half Median Latency Ms'] =
    valueOrBlank_(
      latency.firstHalfMedianLatencyMs
    );

  values['Second Half Median Latency Ms'] =
    valueOrBlank_(
      latency.secondHalfMedianLatencyMs
    );

  values['Fast Responses Under 1s'] =
    valueOrZero_(
      latency.fastResponsesUnder1Sec
    );

  values['Fast Responses Under 2s'] =
    valueOrZero_(
      latency.fastResponsesUnder2Sec
    );

  values['Fast Responses Under 3s'] =
    valueOrZero_(
      latency.fastResponsesUnder3Sec
    );

  values['Longest Fast Sequence Under 2s'] =
    valueOrZero_(
      latency.longestFastResponseSequenceUnder2Sec
    );

  values['Changed Response Count'] =
    valueOrZero_(
      latency.changedResponseCount
    );


  /***********************************************************************
   * RAW TIMING DATA
   ***********************************************************************/

  values['Response Timing JSON'] =
    safeJson_(
      latency.timingEvents || []
    );

  values['Answer Order JSON'] =
    safeJson_(
      latency.answerOrder || []
    );

  values['Visibility Events JSON'] =
    safeJson_(
      latency.visibilityEvents || []
    );

  values['Presentation Order JSON'] =
    safeJson_(
      data.presentationOrder || latency.presentationOrder || []
    );

  const calculatedPeriodic =
    calculatePeriodicPattern_(
      responses,
      data.presentationOrder || latency.presentationOrder || []
    );

  const clientPatternDetected =
    data.patternRepetitionDetected === true ||
    String(data.patternRepetitionDetected || '').toLowerCase() === 'yes';

  values['Pattern Repetition Detected'] =
    clientPatternDetected || calculatedPeriodic.detected
      ? 'Yes'
      : 'No';

  values['Pattern Length'] =
    valueOrBlank_(
      data.patternLength || calculatedPeriodic.patternLength
    );

  values['Pattern Repetitions'] =
    valueOrBlank_(
      data.patternRepetitions || calculatedPeriodic.patternRepetitions
    );

  values['Pattern Start Position'] =
    valueOrBlank_(
      data.patternStartPosition || calculatedPeriodic.patternStartPosition
    );

  values['Pattern End Position'] =
    valueOrBlank_(
      data.patternEndPosition || calculatedPeriodic.patternEndPosition
    );

  values['Maximum Pattern Repetitions'] =
    Math.max(
      Number(data.maximumPatternRepetitions) || 0,
      Number(calculatedPeriodic.maximumPatternRepetitions) || 0
    );

  values['Pattern Warning Count'] =
    valueOrZero_(
      data.patternWarningCount
    );


  /***********************************************************************
   * FINAL QUALITY STATUS
   ***********************************************************************/

  values['Quality Status'] =
    data.qualityStatus || 'clean';

  values['Termination Reason'] =
    data.terminationReason || '';


  /***********************************************************************
   * SCRIPT VERSION
   ***********************************************************************/

  values['Script Version'] =
    SCRIPT_VERSION;


  return headers.map(
    header =>
      Object.prototype
        .hasOwnProperty
        .call(
          values,
          header
        )
        ? values[header]
        : ''
  );
}


/*************************************************************************
 * RESPONSE PATTERN CALCULATOR
 *************************************************************************/

function calculateResponsePattern_(
  responses,
  presentationOrder
) {

  const answers = [];

  const canonicalOrder = [];
  for (let i = 1; i <= 81; i++) {
    canonicalOrder.push('Q' + String(i).padStart(2, '0'));
  }

  const order =
    Array.isArray(presentationOrder) && presentationOrder.length === 81
      ? presentationOrder
      : canonicalOrder;

  order.forEach(function(key) {
    const answer = responses[key];
    if (answer !== undefined && answer !== null && answer !== '') {
      answers.push(String(answer));
    }
  });

  if (
    answers.length === 0
  ) {

    return {
      maxLongstring: '',
      dominantResponse: '',
      dominantResponseCount: '',
      dominantResponsePercent: ''
    };
  }

  let maxLongstring = 1;
  let currentRun = 1;

  for (
    let i = 1;
    i < answers.length;
    i++
  ) {

    if (
      answers[i] ===
      answers[i - 1]
    ) {

      currentRun++;

      if (
        currentRun >
        maxLongstring
      ) {
        maxLongstring =
          currentRun;
      }

    } else {

      currentRun = 1;
    }
  }

  const counts = {};

  answers.forEach(
    answer => {

      if (!counts[answer]) {
        counts[answer] = 0;
      }

      counts[answer]++;
    }
  );

  let dominantResponse = '';
  let dominantResponseCount = 0;

  Object.keys(
    counts
  ).forEach(
    answer => {

      if (
        counts[answer] >
        dominantResponseCount
      ) {

        dominantResponse =
          answer;

        dominantResponseCount =
          counts[answer];
      }
    }
  );

  const dominantResponsePercent =
    Math.round(
      (
        dominantResponseCount /
        answers.length
      ) *
      1000
    ) / 10;

  return {
    maxLongstring:
      maxLongstring,

    dominantResponse:
      dominantResponse,

    dominantResponseCount:
      dominantResponseCount,

    dominantResponsePercent:
      dominantResponsePercent
  };
}


/*************************************************************************
 * PERIODIC RESPONSE-PATTERN CALCULATOR
 *
 * Detects exact repeating cycles of 2-6 response options that span at
 * least 12 scored responses in presentation order. Motifs containing
 * only one unique response are excluded because longstrings are handled
 * separately.
 *************************************************************************/

function calculatePeriodicPattern_(responses, presentationOrder) {
  const canonicalOrder = [];
  for (let i = 1; i <= 81; i++) {
    canonicalOrder.push('Q' + String(i).padStart(2, '0'));
  }

  const order =
    Array.isArray(presentationOrder) && presentationOrder.length === 81
      ? presentationOrder
      : canonicalOrder;

  const answers = [];
  order.forEach(function(key) {
    const answer = responses[key];
    if (answer !== undefined && answer !== null && answer !== '') {
      answers.push(String(answer));
    }
  });

  let best = null;
  let maximumPatternRepetitions = 0;

  for (let period = 2; period <= 6; period++) {
    for (let start = 0; start + period <= answers.length; start++) {
      const motif = answers.slice(start, start + period);
      const unique = {};
      motif.forEach(function(value) { unique[value] = true; });
      if (Object.keys(unique).length < 2) continue;

      let repetitions = 1;
      let cursor = start + period;

      while (cursor + period <= answers.length) {
        let matches = true;
        for (let j = 0; j < period; j++) {
          if (answers[cursor + j] !== motif[j]) {
            matches = false;
            break;
          }
        }
        if (!matches) break;
        repetitions++;
        cursor += period;
      }

      const repeatedItems = repetitions * period;
      if (repeatedItems < 12) continue;

      maximumPatternRepetitions =
        Math.max(maximumPatternRepetitions, repetitions);

      const candidate = {
        detected: true,
        patternLength: period,
        patternRepetitions: repetitions,
        patternStartPosition: start + 1,
        patternEndPosition: start + repeatedItems,
        repeatedItems: repeatedItems
      };

      if (
        !best ||
        candidate.repeatedItems > best.repeatedItems ||
        (
          candidate.repeatedItems === best.repeatedItems &&
          candidate.patternLength < best.patternLength
        ) ||
        (
          candidate.repeatedItems === best.repeatedItems &&
          candidate.patternLength === best.patternLength &&
          candidate.patternStartPosition < best.patternStartPosition
        )
      ) {
        best = candidate;
      }
    }
  }

  if (!best) {
    return {
      detected: false,
      patternLength: '',
      patternRepetitions: '',
      patternStartPosition: '',
      patternEndPosition: '',
      maximumPatternRepetitions: 0
    };
  }

  best.maximumPatternRepetitions = maximumPatternRepetitions;
  return best;
}


/*************************************************************************
 * VALUE HELPERS
 *************************************************************************/

function valueOrBlank_(
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '';
  }

  return value;
}


function valueOrZero_(
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 0;
  }

  return value;
}


function safeJson_(
  value
) {

  try {
    return JSON.stringify(
      value
    );

  } catch (error) {

    return '';
  }
}


/*************************************************************************
 * SUCCESS RESPONSE
 *************************************************************************/

function successResponse_(
  participantIdentifier,
  administrationId,
  submissionType,
  administrationStatus,
  rowNumber
) {

  const data =
    JSON.stringify({
      type:
        'rise-latency-write-success',

      success:
        true,

      participantIdentifier:
        participantIdentifier,

      administrationId:
        administrationId,

      submissionType:
        submissionType,

      administrationStatus:
        administrationStatus,

      rowNumber:
        rowNumber,

      scriptVersion:
        SCRIPT_VERSION
    });

  const html = `
    <!doctype html>
    <html>
      <body>

        <script>

          window.top.postMessage(
            ${data},
            '*'
          );

        </script>

        Saved to per-page latency sheet.

      </body>
    </html>
  `;

  return HtmlService
    .createHtmlOutput(
      html
    )
    .setXFrameOptionsMode(
      HtmlService
        .XFrameOptionsMode
        .ALLOWALL
    );
}


/*************************************************************************
 * ERROR RESPONSE
 *************************************************************************/

function errorResponse_(
  message
) {

  const data =
    JSON.stringify({
      type:
        'rise-latency-write-error',

      success:
        false,

      error:
        message,

      scriptVersion:
        SCRIPT_VERSION
    });

  const html = `
    <!doctype html>
    <html>
      <body>

        <script>

          window.top.postMessage(
            ${data},
            '*'
          );

        </script>

        Per-page latency submission failed.

      </body>
    </html>
  `;

  return HtmlService
    .createHtmlOutput(
      html
    )
    .setXFrameOptionsMode(
      HtmlService
        .XFrameOptionsMode
        .ALLOWALL
    );
}


/*************************************************************************
 * STALE IN-PROGRESS CLEANUP
 *
 * Run setupIncompleteCleanupTrigger() once from the Apps Script editor.
 * It creates an hourly trigger. Any administration still marked
 * "in_progress" after INCOMPLETE_AFTER_MINUTES with no newer checkpoint
 * is relabeled "incomplete". This does not delete partial responses.
 *************************************************************************/

function markStaleInProgressIncomplete() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getLatencySheet_();
    const headers = getHeaders_();
    ensureHeaders_(sheet, headers);

    if (sheet.getLastRow() < 2) return 0;

    const statusIndex = headers.indexOf('Administration Status');
    const checkpointIndex = headers.indexOf('Last Checkpoint At');
    const incompleteIndex = headers.indexOf('Incomplete Marked At');
    const qualityIndex = headers.indexOf('Quality Status');
    const typeIndex = headers.indexOf('Submission Type');

    const rows = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
      .getValues();
    const cutoff = Date.now() - (INCOMPLETE_AFTER_MINUTES * 60 * 1000);
    const now = new Date();
    const staleRows = [];

    rows.forEach(function(row, index) {
      if (String(row[statusIndex] || '').toLowerCase() !== 'in_progress') return;
      const checkpointMs = parseDateMs_(row[checkpointIndex]);
      if (!checkpointMs || checkpointMs > cutoff) return;
      staleRows.push(index + 2);
    });

    staleRows.forEach(function(rowNumber) {
      sheet.getRange(rowNumber, statusIndex + 1).setValue('incomplete');
      sheet.getRange(rowNumber, incompleteIndex + 1).setValue(now);
      sheet.getRange(rowNumber, qualityIndex + 1).setValue('incomplete');
      sheet.getRange(rowNumber, typeIndex + 1).setValue('stale_cleanup');
    });

    if (staleRows.length > 0) SpreadsheetApp.flush();
    return staleRows.length;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function setupIncompleteCleanupTrigger() {
  const handler = 'markStaleInProgressIncomplete';

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyHours(1)
    .create();
}

/*************************************************************************
 * MANUAL LATENCY TEST
 *************************************************************************/

function testLatencyWrite() {

  const responses = {};
  const itemLatencyMs = {};
  const timingEvents = [];
  const answerOrder = [];

  for (
    let i = 1;
    i <= 81;
    i++
  ) {

    const key =
      'Q' +
      String(i).padStart(
        2,
        '0'
      );

    const responseOptions = [
      'Not at all like me',
      'Not much like me',
      'Somewhat like me',
      'Very much like me'
    ];

    const deterministicIndex =
      Math.floor(
        Math.abs(Math.sin(i * 12.9898) * 43758.5453)
      ) % 4;

    responses[key] =
      responseOptions[deterministicIndex];

    /*
     * Deliberately varied test latency:
     * roughly 2 to 8 seconds.
     */
    const latencyMs =
      2000 +
      ((i * 1379) % 6000);

    itemLatencyMs[key] =
      latencyMs;

    timingEvents.push({
      item: key,
      latencyMs: latencyMs,
      response: responses[key],
      changed: false,
      order: i
    });

    answerOrder.push(
      key
    );
  }

  responses['ATTN01'] =
    'Very much like me';

  responses['ATTN02'] =
    'Somewhat like me';

  responses['ATTN03'] =
    'Not much like me';


  const latencies =
    Object.values(
      itemLatencyMs
    );


  const fakeEvent = {
    parameter: {
      payload:
        JSON.stringify({

          participantIdentifier:
            'LATENCY-TEST-001',

          startTime:
            new Date(
              Date.now() -
              360000
            ).toISOString(),

          endTime:
            new Date()
              .toISOString(),

          elapsedSeconds:
            360,

          activeSeconds:
            338,

          inactiveSeconds:
            22,

          age:
            '35-44',

          country:
            'United States',

          englishReadingComfort:
            'Very comfortable',

          interfaceVersion:
            'one-item-per-page-randomized-v2',

          speedWarningCount:
            0,

          firstSpeedWarningItem:
            '',

          speedWarningRule:
            'calibration_only',

          role:
            'Latency Verification Test',

          sector:
            'Testing',

          leadershipYears:
            '4-6 years',

          gender:
            'Prefer not to answer',

          race: [
            'Prefer not to answer'
          ],

          email:
            '',

          source:
            'latency-test',

          consent:
            true,

          attentionCheck1:
            'pass',

          attentionCheck2:
            'pass',

          attentionCheck3:
            'pass',

          qualityWarningCount:
            0,

          reviewChanges:
            0,

          qualityStatus:
            'clean',

          patternRepetitionDetected:
            false,

          patternWarningCount:
            0,

          presentationOrder:
            answerOrder.slice(),

          responses:
            responses,

          latency: {

            activeSeconds:
              338,

            inactiveSeconds:
              22,

            medianResponseLatencyMs:
              median_(
                latencies
              ),

            meanResponseLatencyMs:
              mean_(
                latencies
              ),

            responseLatencySdMs:
              sampleSd_(
                latencies
              ),

            responseLatencyCv:
              sampleSd_(
                latencies
              ) /
              mean_(
                latencies
              ),

            firstHalfMedianLatencyMs:
              median_(
                latencies.slice(
                  0,
                  40
                )
              ),

            secondHalfMedianLatencyMs:
              median_(
                latencies.slice(
                  40
                )
              ),

            fastResponsesUnder1Sec:
              latencies.filter(
                x => x < 1000
              ).length,

            fastResponsesUnder2Sec:
              latencies.filter(
                x => x < 2000
              ).length,

            fastResponsesUnder3Sec:
              latencies.filter(
                x => x < 3000
              ).length,

            longestFastResponseSequenceUnder2Sec:
              longestFastSequence_(
                latencies,
                2000
              ),

            changedResponseCount:
              0,

            itemLatencyMs:
              itemLatencyMs,

            timingEvents:
              timingEvents,

            answerOrder:
              answerOrder,

            visibilityEvents: [
              {
                state:
                  'visible',

                offsetMs:
                  0
              }
            ]
          }
        })
    }
  };

  const result =
    doPost(
      fakeEvent
    );

  Logger.log(
    result.getContent()
  );
}


/*************************************************************************
 * MANUAL PROGRESS / UPSERT TEST
 *
 * Creates one in-progress row and then updates that same row to 10 items.
 * The test should increase the sheet by ONE row, not two.
 *************************************************************************/

function testProgressUpsert() {
  const administrationId = 'PROGRESS-TEST-' + Date.now();
  const start = new Date(Date.now() - 60000).toISOString();
  const order = [];
  const responses = {};
  const itemLatencyMs = {};

  for (let i = 1; i <= 81; i++) {
    order.push('Q' + String(i).padStart(2, '0'));
  }

  const base = {
    administrationId: administrationId,
    administrationStatus: 'in_progress',
    participantIdentifier: 'PROGRESS-TEST',
    startTime: start,
    endTime: '',
    elapsedSeconds: 0,
    age: '35-44',
    country: 'United States',
    englishReadingComfort: 'Very comfortable',
    role: 'Test',
    sector: 'Test',
    leadershipYears: '1-5 years',
    gender: [],
    race: [],
    email: '',
    source: 'manual-test',
    consent: true,
    interfaceVersion: 'one-item-per-page-randomized-v3-progress',
    speedWarningCount: 0,
    speedWarningRule: 'calibration_only',
    presentationOrder: order,
    responses: responses,
    latency: {
      activeSeconds: 0,
      inactiveSeconds: 0,
      itemLatencyMs: itemLatencyMs,
      timingEvents: [],
      answerOrder: [],
      visibilityEvents: []
    }
  };

  const startPayload = Object.assign({}, base, {
    submissionType: 'start',
    checkpointTime: new Date(Date.now() - 50000).toISOString(),
    itemsCompleted: 0,
    lastAnsweredDisplayPosition: 0,
    qualityStatus: 'in_progress'
  });

  doPost({ parameter: { payload: JSON.stringify(startPayload) } });

  for (let i = 1; i <= 10; i++) {
    const key = 'Q' + String(i).padStart(2, '0');
    responses[key] = i % 2 ? 'Somewhat like me' : 'Very much like me';
    itemLatencyMs[key] = 1500 + (i * 50);
  }

  const checkpointPayload = Object.assign({}, base, {
    submissionType: 'checkpoint',
    checkpointTime: new Date().toISOString(),
    elapsedSeconds: 60,
    itemsCompleted: 10,
    lastAnsweredDisplayPosition: 10,
    qualityStatus: 'in_progress'
  });

  doPost({ parameter: { payload: JSON.stringify(checkpointPayload) } });

  Logger.log('Progress test Administration ID: ' + administrationId);
  Logger.log('Expected: one row with Administration Status=in_progress and Items Completed=10.');
}

/*************************************************************************
 * MANUAL PERIODIC-DETECTOR TEST
 *************************************************************************/

function testPeriodicPatternDetector() {
  const order = [];
  const alternating = {};
  const fourCycle = {};
  const labels = [
    'Not at all like me',
    'Not much like me',
    'Somewhat like me',
    'Very much like me'
  ];

  for (let i = 1; i <= 81; i++) {
    const key = 'Q' + String(i).padStart(2, '0');
    order.push(key);
    alternating[key] = labels[(i - 1) % 2];
    fourCycle[key] = labels[(i - 1) % 4];
  }

  Logger.log(
    'Period-2 test: ' +
    JSON.stringify(calculatePeriodicPattern_(alternating, order))
  );

  Logger.log(
    'Period-4 test: ' +
    JSON.stringify(calculatePeriodicPattern_(fourCycle, order))
  );
}


/*************************************************************************
 * TEST-ONLY STATISTICAL HELPERS
 *************************************************************************/

function mean_(
  values
) {

  if (!values.length) {
    return 0;
  }

  return values.reduce(
    (sum, value) =>
      sum + value,
    0
  ) / values.length;
}


function median_(
  values
) {

  if (!values.length) {
    return 0;
  }

  const sorted =
    values
      .slice()
      .sort(
        (a, b) =>
          a - b
      );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2
  ) {
    return sorted[middle];
  }

  return (
    sorted[middle - 1] +
    sorted[middle]
  ) / 2;
}


function sampleSd_(
  values
) {

  if (
    values.length < 2
  ) {
    return 0;
  }

  const avg =
    mean_(
      values
    );

  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        Math.pow(
          value - avg,
          2
        ),
      0
    ) /
    (
      values.length - 1
    );

  return Math.sqrt(
    variance
  );
}


function longestFastSequence_(
  values,
  thresholdMs
) {

  let longest = 0;
  let current = 0;

  values.forEach(
    value => {

      if (
        value <
        thresholdMs
      ) {

        current++;

        if (
          current >
          longest
        ) {
          longest =
            current;
        }

      } else {

        current = 0;
      }
    }
  );

  return longest;
}
