/**
 * Service for submitting code to DomJudge.
 * Handles the submission of generated code to the DomJudge system for evaluation.
 */

/**
 * Submits generated code to DomJudge for evaluation.
 * @param {Sheet} sheet - The master sheet.
 * @param {Array[]} data - Sheet data as 2D array.
 * @param {number} rowIndex - Index of the row in data to process.
 * @return {boolean} - True if submission was successful.
 */
function submitCodeToDomJudge(sheet, data, rowIndex) {
  const realRow = rowIndex + 1; // 1-indexed for actual sheet operations
  
  // Extract necessary data
  var codeFileUrl = getSheetValueByColumnName(data, rowIndex, sheet, getConfig().CodeFileUrlColumnName);
  if (!codeFileUrl) {
    logEvent("No code file URL found for row: " + realRow, getConfig().logLevelError);
    console.log("No code file URL found for row: " + realRow);
    return false;
  }
  
  var code = getCodeFromDriveUrl(codeFileUrl);
  if (!code) {
    logEvent("Failed to retrieve code from URL: " + codeFileUrl, getConfig().logLevelError);
    console.log("Failed to retrieve code from URL: " + codeFileUrl);
    return false;
  }
  
  var problemNumber = getSheetValueByColumnName(data, rowIndex, sheet, getConfig().ProblemNumberColumnName);
  logEvent("Raw problem number from sheet: " + problemNumber, getConfig().logLevelDebug);
  console.log("Raw problem number from sheet: " + problemNumber);
  
  // Extract just the problem code (e.g., "FCP045" from "FCP045 - Title")
  var problemCode = String(problemNumber).split(" ")[0].trim();
  logEvent("Extracted problem code: " + problemCode, getConfig().logLevelDebug);
  console.log("Extracted problem code: " + problemCode);
  
  var problemId = getProblemIdFromMeta(problemCode);
  logEvent("Resolved problem ID: " + problemId, getConfig().logLevelDebug);
  console.log("Resolved problem ID: " + problemId);
  
  if (problemId === null || problemId === undefined) {
    // Log this as a critical error to ensure visibility
    logEvent("CRITICAL: No valid problem ID found for problem code: " + problemCode, getConfig().logLevelError);
    console.log("CRITICAL: No valid problem ID found for problem code: " + problemCode);
    
    // Create meaningful error message to display in sheet
    setCellValueByColumnName(sheet, realRow, getConfig().VerdictColumnName, 
                            "ERROR: Problem code " + problemCode + " not found in Meta sheet");
    
    // Update status to indicate the problem
    setCellValueByColumnName(sheet, realRow, getConfig().StatusColumnName, 
                            getConfig().CannotProcessStatus);
    
    return false;
  }
  
  // Submit to DomJudge
  var submissionTimestamp = new Date();
  var submissionId = submitToDomjudge(code, problemId);
  console.log("submission attempt for: " + problemCode + ", result: " + submissionId);
  
  if (!submissionId) {
    return false;
  }
  
  // Save submission data
  saveSubmissionMetadata(sheet, realRow, submissionId, submissionTimestamp);
  return true;
}


// Remove this function since it's now in domjudge.js
// Just call submitToDomjudge() from domjudge.js directly
/**
 * Saves metadata about a DomJudge submission.
 * @param {Sheet} sheet - The sheet to update.
 * @param {number} row - The row number.
 * @param {string} submissionId - The submission ID from DomJudge.
 * @param {Date} timestamp - Submission timestamp.
 */
function saveSubmissionMetadata(sheet, row, submissionId, timestamp) {
  var metadata = {
    [getConfig().SubmissionIdColumnName]: submissionId,
    [getConfig().SubmissionTimestampColumnName]: timestamp,
    [getConfig().SubmissionStatusColumnName]: getConfig().SubmissionStatus,
    [getConfig().StatusColumnName]: getConfig().JudgeSubmittedStatus
  };
  
  updateSheetMetadata(sheet, row, metadata);
}

/**
 * Triggers DomJudge submission for all eligible entries in the master sheet.
 */
function triggerDomJudgeProcessing() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  // Get all sheet data using helper function
  var data = getSheetData(masterSheet);
  
  for (var i = 1; i < data.length; i++) {
    var status = getSheetValueByColumnName(data, i, masterSheet, getConfig().StatusColumnName);
    
    if (status === getConfig().GeminiDoneStatus) {
      submitCodeToDomJudge(masterSheet, data, i);
    }
  }
}
