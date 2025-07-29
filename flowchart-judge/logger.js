function logEvent(msg, logLevel = getConfig().logLevelError) {
  if (logLevel >= getConfig().loggingLevel) {
    if (getSheet(getConfig().logEventSheet) == null) {
      insertNewTab(getConfig().logEventSheet);
      addDataToSheet([["DATE", "LOG_LEVEL", "MESSAGE"]], getConfig().logEventSheet);
    }
    let log_string = logLevel === getConfig().logLevelDebug ? "DEBUG" : "ERROR";
    addDataToSheet([[new Date().toISOString(), log_string, msg]], getConfig().logEventSheet);
  }
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
