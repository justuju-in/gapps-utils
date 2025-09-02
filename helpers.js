function getProblemIdFromMeta(problemCode) {
  var metaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(getConfig().metaSheet);
  if (!metaSheet) {
    logEvent('Meta sheet not found', getConfig().logLevelError);
    return null;
  }
  var data = metaSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === problemCode) {
      // Convert numeric IDs to Number type for DOMjudge API
      var problemId = data[i][1];
      if (!isNaN(problemId)) {
        problemId = Number(problemId);
      }
      return problemId;
    }
  }
  logEvent('Problem code ' + problemCode + ' not found in Meta sheet', getConfig().logLevelError);
  return null;
}

/**
 * Cleans a code block by removing unnecessary markdown and formatting.
 * @param {string} text - The text containing the code.
 * @returns {string} The cleaned code.
 */
function cleanCodeBlock(text) {
  if (!text) return "";
  
  // Try to extract Python code from markdown code blocks
  const codeBlockRegex = /```(?:python)?\s*([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    // Use the first code block found
    return matches[0][1].trim();
  }
  
  // If no code block, return the original text
  return text.trim();
}

