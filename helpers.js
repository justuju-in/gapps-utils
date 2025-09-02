/**
 * This file contains general helper functions used across the application.
 */

/**
 * Gets the header row from a sheet.
 * @param {Sheet} sheet - The sheet to get headers from.
 * @returns {Array} The header row as an array.
 */
function getSheetHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * Finds the index of a value in an array.
 * @param {Array} array - The array to search in.
 * @param {*} value - The value to find.
 * @returns {number} The zero-based index of the value, or -1 if not found.
 */
function findIndexInArray(array, value) {
  return array.indexOf(value);
}

/**
 * Gets the index of a column by its name in the header row.
 * @param {Sheet} sheet - The sheet to search in.
 * @param {string} name - The column name to find.
 * @returns {number} The 1-based index of the column.
 * @throws {Error} If the column is not found.
 */
function getColumnIndexByName(sheet, name) {
  var headers = getSheetHeaders(sheet);
  var idx = findIndexInArray(headers, name) + 1; // Convert to 1-based
  if (idx === 0) {
    logEvent(
      "getColumnIndexByName: Column not found: " + name,
      getConfig().logLevelError
    );
    throw new Error('Column "' + name + '" not found in sheet');
  }
  return idx;
}

/**
 * Finds a row in sheet data by matching a value in a specific column.
 * @param {Array[]} data - The sheet data as a 2D array.
 * @param {number} columnIndex - The zero-based index of the column to match.
 * @param {*} value - The value to match.
 * @returns {Object} Object with rowIndex and rowData, or null if not found.
 */
function findRowByColumnValue(data, columnIndex, value) {
  for (var i = 1; i < data.length; i++) { // Skip header
    if (data[i][columnIndex] === value) {
      return {
        rowIndex: i,
        rowData: data[i]
      };
    }
  }
  return null;
}

/**
 * Gets the meta sheet.
 * @returns {Sheet|null} The meta sheet or null if not found.
 */
function getMetaSheet() {
  var metaSheetName = getConfig().metaSheet;
  var metaSheet = getSheet(metaSheetName);
  if (!metaSheet) {
    logEvent(
      "getMetaSheet: Meta sheet not found",
      getConfig().logLevelError
    );
    return null;
  }
  return metaSheet;
}

/**
 * Gets a problem ID from the meta sheet based on problem code.
 * @param {string} problemCode - The problem code to look up.
 * @returns {string|null} The problem ID or null if not found.
 */
function getProblemIdFromMeta(problemCode) {
  var metaSheet = getMetaSheet();
  if (!metaSheet) return null;
  
  var data = getSheetData(metaSheet);
  var result = findRowByColumnValue(data, 0, problemCode); // Column A: Problem code
  
  if (result) {
    logEvent(
      "getProblemIdFromMeta: Found problemId=" +
        result.rowData[1] +
        " for problemCode=" +
        problemCode,
      getConfig().logLevelDebug
    );
    return result.rowData[1]; // Column B: Problem id
  }
  
  logEvent(
    "getProblemIdFromMeta: Problem code " +
      problemCode +
      " not found in Meta sheet",
    getConfig().logLevelError
  );
  return null;
}

/**
 * Extracts code block content using a regular expression.
 * @param {string} text - The text containing code blocks.
 * @param {RegExp} regex - The regular expression to use.
 * @returns {string} The text with code blocks replaced.
 */
function extractCodeWithRegex(text, regex) {
  return text.replace(regex, "$1");
}

/**
 * Cleans code blocks from markdown-formatted text.
 * @param {string} text - The text containing code blocks.
 * @returns {string} The cleaned code.
 */
function cleanCodeBlock(text) {
  // This regex matches code between triple backticks, optionally with a language tag like "python"
  var regex = /```(?:\w+)?\n([\s\S]*?)```/g;
  var cleaned = extractCodeWithRegex(text, regex);
  Logger.log(cleaned);
  return cleaned;
}
