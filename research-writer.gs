function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById('1hgqS1-XRxqXpMSckl1H7zr9n6dA2Iu_Sc_gL8ObLHLk');
    let sheet = ss.getSheetByName('Research Website Responses');
    if (!sheet) sheet = ss.insertSheet('Research Website Responses');

    const raw = (e && e.parameter && e.parameter.payload) ? e.parameter.payload : '{}';
    const data = JSON.parse(raw);
    const responseKeys = Object.keys(data.responses || {});

    const baseHeaders = [
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
      'Source'
    ];

    const desiredHeaders = baseHeaders.concat(responseKeys);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, desiredHeaders.length).setValues([desiredHeaders]);
    } else {
      const currentLastCol = Math.max(sheet.getLastColumn(), 1);
      const currentHeaders = sheet.getRange(1, 1, 1, currentLastCol).getValues()[0];
      const missingHeaders = desiredHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      }
    }

    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const valuesByHeader = {
      'Submitted At': new Date(),
      'Participant Identifier': data.participantIdentifier || '',
      'Start Time': data.startTime || '',
      'End Time': data.endTime || '',
      'Elapsed Seconds': data.elapsedSeconds || '',
      'Age Range': data.age || '',
      'Country': data.country || '',
      'Professional Role': data.role || '',
      'Sector': data.sector || '',
      'Years in Leadership': data.leadershipYears || '',
      'Gender Identity': data.gender || '',
      'Race / Ethnicity': data.race || '',
      'Email': data.email || '',
      'Source': data.source || ''
    };

    responseKeys.forEach(function(key) {
      valuesByHeader[key] = data.responses[key] || '';
    });

    const row = finalHeaders.map(function(header) {
      return Object.prototype.hasOwnProperty.call(valuesByHeader, header) ? valuesByHeader[header] : '';
    });

    sheet.appendRow(row);
    SpreadsheetApp.flush();

    return HtmlService.createHtmlOutput(
      '<!doctype html><html><body><script>' +
      'window.top.postMessage(' + JSON.stringify({type: 'rise-write-success'}) + ', "*");' +
      '</script></body></html>'
    );
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><html><body><script>' +
      'window.top.postMessage(' + JSON.stringify({type: 'rise-write-error', error: String(error && error.message ? error.message : error)}) + ', "*");' +
      '</script></body></html>'
    );
  }
}
