/**
 * Service for common sheet operations.
 * Provides utilities for working with Google Sheets.
 */

/**
 * Gets a sheet by name, returns null if the sheet doesn't exist.
 * @param {string} sheetName - The name of the sheet to get.
 * @returns {Sheet|null} The sheet object or null if not found.
 */
function getSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getSheetByName(sheetName);
  } catch (e) {
    console.error("Error getting sheet: " + e);
    return null;
  }
}

/**
 * Creates a new sheet tab with the given name.
 * @param {string} tabName - The name for the new sheet tab.
 * @returns {Sheet} The newly created sheet.
 */
function insertNewTab(tabName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.insertSheet(tabName);
  } catch (e) {
    console.error("Error creating sheet tab: " + e);
    throw e;
  }
}

/**
 * Adds data to a specified sheet.
 * @param {Array[]} data - 2D array of data to add.
 * @param {string} sheetName - The name of the sheet to add data to.
 * @returns {boolean} True if successful.
 */
function addDataToSheet(data, sheetName) {
  try {
    const sheet = getSheet(sheetName);
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' not found`);
    }
    
    // Get last row with data
    const lastRow = sheet.getLastRow();
    
    // Insert data at next row
    const range = sheet.getRange(lastRow + 1, 1, data.length, data[0].length);
    range.setValues(data);
    
    return true;
  } catch (e) {
    console.error("Error adding data to sheet: " + e);
    return false;
  }
}

/**
 * Updates multiple metadata values for a row in a sheet.
 * @param {Sheet} sheet - The sheet to update.
 * @param {number} row - The row number.
 * @param {Object} metadata - Object with column names as keys and values to set.
 */
function updateSheetMetadata(sheet, row, metadata) {
  for (const [columnName, value] of Object.entries(metadata)) {
    setSheetCellValueByColumnName(sheet, row, columnName, value);
  }
}

/**
 * Gets the value from sheet data by column name.
 * @param {Array[]} data - Sheet data as 2D array.
 * @param {number} rowIndex - Index of the row in data.
 * @param {Sheet} sheet - The sheet object.
 * @param {string} columnName - Name of the column to get the value from.
 * @returns {*} The value in the cell.
 */
function getValueFromDataByColumnName(data, rowIndex, sheet, columnName) {
  const headers = data[0];
  const colIndex = headers.indexOf(columnName);
  
  if (colIndex === -1) {
    console.error(`Column '${columnName}' not found in sheet`);
    return null;
  }
  
  return data[rowIndex][colIndex];
}

/**
 * Gets a sheet data value by column name.
 * @param {Array[]} data - Sheet data as 2D array.
 * @param {number} rowIndex - Index of the row in data.
 * @param {Sheet} sheet - The sheet object.
 * @param {string} columnName - Name of the column to get the value from.
 * @returns {*} The value in the cell.
 */
function getSheetValueByColumnName(data, rowIndex, sheet, columnName) {
  return getValueFromDataByColumnName(data, rowIndex, sheet, columnName);
}

/**
 * Sets a cell value by column name.
 * @param {Sheet} sheet - The sheet to update.
 * @param {number} row - The row number.
 * @param {string} columnName - Name of the column to set.
 * @param {*} value - The value to set.
 */
function setCellValueByColumnName(sheet, row, columnName, value) {
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const col = headers.indexOf(columnName) + 1; // Convert to 1-based index
    
    if (col === 0) { // Not found
      console.error(`Column '${columnName}' not found in sheet`);
      return false;
    }
    
    sheet.getRange(row, col).setValue(value);
    return true;
  } catch (e) {
    console.error("Error setting cell value: " + e);
    return false;
  }
}

/**
 * Sets a cell value by column name.
 * @param {Sheet} sheet - The sheet to update.
 * @param {number} row - The row number.
 * @param {string} columnName - Name of the column to set.
 * @param {*} value - The value to set.
 */
function setSheetCellValueByColumnName(sheet, row, columnName, value) {
  return setCellValueByColumnName(sheet, row, columnName, value);
}

/**
 * Gets sheet data as a 2D array.
 * @param {Sheet} sheet - The sheet to get data from.
 * @returns {Array[]} 2D array of sheet data.
 */
function getSheetData(sheet) {
  return sheet.getDataRange().getValues();
}

/**
 * Appends a row to a sheet.
 * @param {Sheet} sheet - The sheet to append to.
 * @param {Array} rowData - Array of values to append.
 */
function appendRowToSheet(sheet, rowData) {
  sheet.appendRow(rowData);
}

/**
 * Gets or creates a sheet with the specified name and headers.
 * @param {string} sheetName - The name of the sheet.
 * @param {Array} headers - Array of header column names.
 * @returns {Sheet} The sheet object.
 */
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  
  return sheet;
}
