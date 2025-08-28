/**
 * Gets the active spreadsheet.
 * @returns {Spreadsheet} The active spreadsheet.
 */
function getActiveSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Gets a sheet by name from the active spreadsheet.
 * @param {string} sheetName - The name of the sheet to get.
 * @returns {Sheet|null} The sheet object or null if not found.
 */
function getSheet(sheetName) {
  return getActiveSpreadsheet().getSheetByName(sheetName);
}

/**
 * Creates a new sheet in the active spreadsheet.
 * @param {string} sheetName - The name for the new sheet.
 * @returns {Sheet} The newly created sheet.
 */
function createSheet(sheetName) {
  return getActiveSpreadsheet().insertSheet(sheetName);
}

/**
 * Creates a new sheet with header row.
 * @param {string} sheetName - The name for the new sheet.
 * @param {Array} headers - Array of header names.
 * @returns {Sheet} The newly created sheet with headers.
 */
function createSheetWithHeaders(sheetName, headers) {
  var sheet = createSheet(sheetName);
  if (headers && headers.length > 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

/**
 * Gets an existing sheet or creates a new one if it doesn't exist.
 * @param {string} sheetName - The name of the sheet to get or create.
 * @param {Array} [headers] - Optional array of header names for new sheet.
 * @returns {Sheet} The existing or newly created sheet.
 */
function getOrCreateSheet(sheetName, headers) {
  var sheet = getSheet(sheetName);
  if (!sheet) {
    sheet = headers ? createSheetWithHeaders(sheetName, headers) : createSheet(sheetName);
  }
  return sheet;
}

/**
 * Inserts a new tab (sheet) in the spreadsheet.
 * @param {string} sheetName - The name for the new sheet.
 * @returns {Sheet} The newly created sheet.
 */
function insertNewTab(sheetName) {
  return createSheet(sheetName);
}

/**
 * Gets the data range for a sheet.
 * @param {Sheet} sheet - The Google Sheet object.
 * @returns {Range} The data range for the sheet.
 */
function getSheetDataRange(sheet) {
  return sheet.getDataRange();
}

/**
 * Gets all data from the sheet as a 2D array.
 * @param {Sheet} sheet - The Google Sheet object.
 * @returns {Array[]} All sheet data.
 */
function getSheetData(sheet) {
  return getSheetDataRange(sheet).getValues();
}

/**
 * Gets a specific range from a sheet.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {number} row - The starting row (1-based).
 * @param {number} col - The starting column (1-based).
 * @param {number} numRows - The number of rows in the range.
 * @param {number} numCols - The number of columns in the range.
 * @returns {Range} The specified range.
 */
function getSheetRange(sheet, row, col, numRows, numCols) {
  return sheet.getRange(row, col, numRows, numCols);
}

/**
 * Returns the data for a specific row in the given sheet.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {number} row - The row number to retrieve.
 * @returns {Array} The row data as an array.
 */
function getRowData(sheet, row) {
  return getSheetRange(sheet, row, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * Appends a row to the given sheet.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {Array} rowData - The row data to append.
 */
function appendRowToSheet(sheet, rowData) {
  sheet.appendRow(rowData);
}

/**
 * Adds data (first row only) to a sheet by name.
 * @param {Array[]} data - The data to add (2D array).
 * @param {string} sheetName - The name of the sheet to add data to.
 * @returns {boolean} True if successful, false otherwise.
 */
function addDataToSheet(data, sheetName) {
  var sheet = getSheet(sheetName);
  if (sheet && data && data.length > 0) {
    appendRowToSheet(sheet, data[0]);
    return true;
  }
  return false;
}

/**
 * Sets a value in a single cell at the specified range.
 * @param {Range} range - The range to set the value in.
 * @param {any} value - The value to set.
 */
function setRangeValue(range, value) {
  range.setValue(value);
}

/**
 * Sets a value in the sheet at the specified row and column.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {number} row - The row number (1-based).
 * @param {number} col - The column number (1-based).
 * @param {any} value - The value to set.
 */
function setSheetValue(sheet, row, col, value) {
  var range = getSheetRange(sheet, row, col, 1, 1);
  setRangeValue(range, value);
}

/**
 * Gets a specific value from row data by column name.
 * @param {Array} rowData - The row data array.
 * @param {Sheet} sheet - The sheet containing the row data.
 * @param {string} columnName - The name of the column to get data from.
 * @returns {any} The value in the specified column.
 */
function getValueByColumnName(rowData, sheet, columnName) {
  var columnIndex = getColumnIndexByName(sheet, columnName);
  return rowData[columnIndex - 1];
}

/**
 * Gets a specific value from sheet data by row index and column name.
 * @param {Array[]} data - The sheet data as a 2D array.
 * @param {number} rowIndex - The index of the row in the data array.
 * @param {Sheet} sheet - The sheet containing the data.
 * @param {string} columnName - The name of the column to get data from.
 * @returns {any} The value at the specified row and column.
 */
function getValueFromDataByColumnName(data, rowIndex, sheet, columnName) {
  var columnIndex = getColumnIndexByName(sheet, columnName);
  return data[rowIndex][columnIndex - 1];
}

/**
 * Sets a cell value by column name.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {number} row - The row number (1-based).
 * @param {string} columnName - The name of the column.
 * @param {any} value - The value to set.
 */
function setCellValueByColumnName(sheet, row, columnName, value) {
  var col = getColumnIndexByName(sheet, columnName);
  setSheetValue(sheet, row, col, value);
}

/**
 * Updates multiple metadata fields in a row.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {number} row - The row number (1-based).
 * @param {Object} metadata - Object containing column name keys and corresponding values.
 */
function updateMetadata(sheet, row, metadata) {
  Object.keys(metadata).forEach(function(columnName) {
    setCellValueByColumnName(sheet, row, columnName, metadata[columnName]);
  });
}
