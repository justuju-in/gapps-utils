// Helper functions for spreadsheet and URL handling
function getColumnIndexByName(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(name) + 1;
}

function getFileIdFromUrl(url) {
  var regex = /[-\w]{25,}/;
  var matches = url.match(regex);
  return matches ? matches[0] : null;
}


function getProblemIdFromMeta(problemCode) {
  var metaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Meta');
  if (!metaSheet) {
    logEvent('Meta sheet not found', LOG_LEVEL_ERROR);
    return null;
  }
  var data = metaSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { // skip header
    if (data[i][0] === problemCode) {
      return data[i][1]; // Column B: Problem id
    }
  }
  logEvent('Problem code ' + problemCode + ' not found in Meta sheet', LOG_LEVEL_ERROR);
  return null;
}