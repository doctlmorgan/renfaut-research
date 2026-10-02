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
 *************************************************************************/


/*************************************************************************
 * CONFIGURATION
 *************************************************************************/

const SPREADSHEET_ID =
  '1nRRl3Ul2vsEkd0aU7Z57JPikBoy9Kh1_kAe5Dirn7IQ';

const SHEET_NAME =
  'Latency Per-Page';

const SCRIPT_VERSION =
  'latency-per-page-v1';


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

    sheet.appendRow(row);

    SpreadsheetApp.flush();

    return successResponse_(
      data.participantIdentifier || ''
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

  headers.push('Response Timing JSON', 'Answer Order JSON', 'Visibility Events JSON');
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
      data.speedWarningRule || ''
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
      responses
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
  responses
) {

  const answers = [];

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

    const answer =
      responses[key];

    if (
      answer !== undefined &&
      answer !== null &&
      answer !== ''
    ) {

      answers.push(
        String(answer)
      );
    }
  }

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
  participantIdentifier
) {

  const data =
    JSON.stringify({
      type:
        'rise-latency-write-success',

      success:
        true,

      participantIdentifier:
        participantIdentifier,

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

    const pattern =
      i % 4;

    if (
      pattern === 1
    ) {
      responses[key] =
        'Not at all like me';

    } else if (
      pattern === 2
    ) {
      responses[key] =
        'Not much like me';

    } else if (
      pattern === 3
    ) {
      responses[key] =
        'Somewhat like me';

    } else {
      responses[key] =
        'Very much like me';
    }

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
            'one-item-per-page-v1',

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
