function getProblemIdFromMeta(problemCode) {
  var metaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(getConfig().metaSheet);
  if (!metaSheet) {
    logEvent('Meta sheet not found', getConfig().logLevelError);
    return null;
  }
  var data = metaSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === problemCode) {
      return data[i][1];
    }
  }
  logEvent('Problem code ' + problemCode + ' not found in Meta sheet', getConfig().logLevelError);
  return null;
}
