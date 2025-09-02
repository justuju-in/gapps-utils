const logSheetName = getConfig().logEventSheet;
const LOG_LEVEL_DEBUG = getConfig().logLevelDebug;
const LOG_LEVEL_ERROR = getConfig().logLevelError;
const logging_level = getConfig().loggingLevel;

function logEvent(msg, logLevel = LOG_LEVEL_ERROR) {
  if (logLevel >= logging_level) {
    if (getSheet(logSheetName) == null) {
      insertNewTab(logSheetName);
      addDataToSheet([[getConfig().logDateHeader, getConfig().logLevelHeader, getConfig().logMessageHeader]], logSheetName);
    }
    let log_string = logLevel === LOG_LEVEL_DEBUG ? getConfig().logDebugString : getConfig().logErrorString;
    addDataToSheet([[new Date().toISOString(), log_string, msg]], logSheetName);
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
