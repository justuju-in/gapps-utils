function getOrCreateSheet(sheetName, headers) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

function insertNewTab(sheetName) {
  SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
}

function addDataToSheet(data, sheetName) {
  var sheet = getSheet(sheetName);
  if (sheet) {
    sheet.appendRow(data[0]);
  }
}
