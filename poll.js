/**
 * poll.js - Centralized polling functionality for DOMjudge API
 * 
 * This file contains the official implementation of all polling functions
 * for checking the status of DOMjudge submissions. All other files should
 * use these functions rather than implementing their own polling logic.
 */

/**
 * Polls the DomJudge system for a verdict on a submission.
 * This is the official polling implementation that should be used throughout the application.
 * It uses admin credentials for better API access and queries only the specific submission.
 * 
 * @param {string} submissionId - The ID of the submission to check.
 * @returns {string|null} The verdict if available, or null if still pending.
 */
function pollJudgement(submissionId) {
  const contestId = getConfig().domjudgeContestId;
  const domjudgeUrl = getConfig().domjudgeApiUrl;
  
  // Create the judgements URL using the utility function
  const url = createDomjudgeJudgementsUrl(domjudgeUrl, contestId, submissionId);
  
  console.log("Polling judgements for submission. URL: " + url);
  logEvent("Polling judgements for submission. URL: " + url, getConfig().logLevelDebug);
  
  // Create headers using admin credentials for better access
  const headers = createDomjudgeAdminAuthHeaders();
  
  // Create request options using utility
  const options = createGetRequestOptions(headers);

  // Make the API call using the centralized utility
  const response = makeDomjudgeRequest(url, options);
  
  if (response.success) {
    const judgements = response.json; // array of judgements
    logEvent("Got " + judgements.length + " judgements for submission " + submissionId, getConfig().logLevelDebug);
    
    if (judgements.length > 0) {
      const j = judgements[0];
      console.log(j.judgement_type_id);
      return j.judgement_type_id;
    }
    return null;
  } else {
    logEvent("Error polling judgements: " + response.code + " - " + response.body, getConfig().logLevelError);
    return null;
  }
}

/**
 * Polls DomJudge for a verdict on a submission and updates the sheet.
 * This function is the bridge between the polling system and sheet updates.
 *
 * @param {Sheet} sheet - The master sheet.
 * @param {Array[]} data - Sheet data as 2D array.
 * @param {number} rowIndex - Index of the row in data to process.
 * @return {boolean} - True if a verdict was retrieved.
 */
function pollVerdictForSubmission(sheet, data, rowIndex) {
  const realRow = rowIndex + 1; // 1-indexed for actual sheet operations
  
  // Extract submission ID
  var submissionId = getSheetValueByColumnName(data, rowIndex, sheet, getConfig().SubmissionIdColumnName);
  if (!submissionId) {
    return false;
  }
  
  // Poll for verdict
  var result = pollJudgement(submissionId);
  if (!result) {
    return false;
  }
  
  // Save verdict
  saveVerdictData(sheet, realRow, result);
  return true;
}

/**
 * Saves verdict data from DomJudge.
 * @param {Sheet} sheet - The sheet to update.
 * @param {number} row - The row number.
 * @param {string} verdict - The verdict from DomJudge.
 */
function saveVerdictData(sheet, row, verdict) {
  var metadata = {
    [getConfig().VerdictColumnName]: verdict,
    [getConfig().StatusColumnName]: getConfig().VerdictReadyStatus
  };
  
  updateSheetMetadata(sheet, row, metadata);
}

/**
 * Triggers verdict polling for all eligible entries in the master sheet.
 * This function is called from the UI menu and scheduled triggers.
 */
function triggerVerdictPolling() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  
  // Get all sheet data using helper function
  var data = getSheetData(masterSheet);
  
  for (var i = 1; i < data.length; i++) {
    var status = getSheetValueByColumnName(data, i, masterSheet, getConfig().StatusColumnName);
    
    if (status === getConfig().JudgeSubmittedStatus) {
      pollVerdictForSubmission(masterSheet, data, i);
    }
  }
}
