/**
 * Service for handling form submissions.
 * Handles the processing of new form submissions and their entry into the master sheet.
 */

/**
 * Handler for form submissions.
 * @param {Object} e - The form submission event.
 */
function processFormSubmission(e) {
  try {
    // Extract submission data
    var submissionData = extractSubmissionData(e);
    
    // Get or create master sheet
    var masterSheet = getOrCreateSheet(
      getConfig().masterSheet,
      getConfig().masterSheetColumns
    );
    
    // Create and append row to master sheet
    var newRow = createMasterSheetRow(submissionData);
    appendRowToSheet(masterSheet, newRow);
    
    logEvent("New submission processed successfully", getConfig().logLevelDebug);
  } catch (err) {
    logEvent(
      "Error in processFormSubmission: " + err.message,
      getConfig().logLevelError
    );
  }
}

/**
 * Extracts submission data from a form submission.
 * @param {Object} e - The form submission event.
 * @return {Object} - The extracted submission data.
 */
function extractSubmissionData(e) {
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var rowData = getRowData(sheet, row);
  
  return {
    timestamp: getValueByColumnName(rowData, sheet, getConfig().TimestampColumnName),
    email: getValueByColumnName(rowData, sheet, getConfig().EmailAddressColumnName),
    problemCode: getValueByColumnName(rowData, sheet, getConfig().ProblemNumberColumnName),
    flowchartUrl: getValueByColumnName(rowData, sheet, getConfig().UploadFlowchartColumnName)
  };
}

/**
 * Creates a new row for the master sheet from submission data.
 * @param {Object} data - The submission data.
 * @return {Array} - Array representing the new row.
 */
function createMasterSheetRow(data) {
  return [
    data.timestamp,
    data.email,
    data.problemCode,
    data.flowchartUrl,
    getConfig().NewEntryStatus,
    "", // Empty placeholders for remaining columns
    "",
    "",
    ""
  ];
}
