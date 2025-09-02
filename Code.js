function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Evaluate Flowcharts")
    .addItem("Process Gemini", "triggerGeminiProcessing")
    .addItem("Process DomJudge", "triggerDomJudgeProcessing")
    .addItem("Poll Verdict", "triggerVerdictPolling")
    .addToUi();
}

/**
 * Extracts submission data from a form submission.
 * @param {Object} e - The form submission event.
 * @return {Object} - The extracted submission data.
 */
function extractSubmissionData(v) {
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

function onFormSubmit(e) {
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
      "Error in onFormSubmit: " + err.message,
      getConfig().logLevelError
    );
  }
}

/**
 * Processes a single flowchart submission with Gemini.
 * @param {Sheet} sheet - The master sheet.
 * @param {Array[]} data - Sheet data as 2D array.
 * @param {number} rowIndex - Index of the row in data to process.
 * @return {boolean} - True if processing was successful.
 */
function processFlowchartWithGemini(sheet, data, rowIndex) {
  const realRow = rowIndex + 1; // 1-indexed for actual sheet operations
  
  // Extract necessary data
  var flowchartUrl = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().UploadFlowchartColumnName);
  var promptText = getPrompt();
  var fileId = getFileIdFromUrl(flowchartUrl);
  
  if (!fileId) {
    logEvent("Invalid fileId for flowchart URL: " + flowchartUrl, getConfig().logLevelError);
    return false;
  }
  
  // Save image MIME type
  const mimeType = getImageMimeType(fileId);
  setCellValueByColumnName(sheet, realRow, getConfig().ImageMimeTypeColumnName, mimeType);
  
  // Process with Gemini
  var gemResult = callGeminiWithDrivePDF(fileId, promptText, getConfig().geminiTemperature);
  if (!gemResult) {
    logEvent("Gemini processing failed for row: " + realRow, getConfig().logLevelError);
    return false;
  }
  
  // Extract and clean code
  var code = gemResult.content ? cleanCodeBlock(gemResult.content) : cleanCodeBlock(gemResult);
  
  // Get submission metadata
  var timestamp = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().TimestampColumnName);
  var email = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().EmailAddressColumnName);
  var problemCode = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().ProblemNumberColumnName);
  var problemId = getProblemIdFromMeta(problemCode.split(" ")[0]);
  
  // Save code and get URL
  var codeFileUrl = saveCodeToDrive(timestamp, email, problemId, code);
  var generationTimestamp = new Date();
  
  // Save all metadata (basic and extended)
  saveGeminiMetadata(sheet, realRow, codeFileUrl, generationTimestamp, gemResult.metadata);
  
  // Update status
  setCellValueByColumnName(sheet, realRow, getConfig().StatusColumnName, getConfig().GeminiDoneStatus);
  
  return true;
}

/**
 * Saves all Gemini metadata (basic and detailed) to the sheet.
 * @param {Sheet} sheet - The sheet to update.
 * @param {number} row - The row number.
 * @param {string} codeFileUrl - URL to the generated code file.
 * @param {Date} timestamp - Generation timestamp.
 * @param {Object} metadata - Metadata from Gemini API response (optional).
 */
function saveGeminiMetadata(sheet, row, codeFileUrl, timestamp, metadata) {
  // Basic metadata (always present)
  var allMetadata = {
    [getConfig().CodeFileUrlColumnName]: codeFileUrl,
    [getConfig().ModelUsedColumnName]: getConfig().geminiModel,
    [getConfig().PromptVersionColumnName]: getConfig().promptVersion,
    [getConfig().GenerationTimestampColumnName]: timestamp
  };
  
  // Add detailed Gemini API response metadata if available
  if (metadata) {
    allMetadata[getConfig().InputTokensColumnName] = metadata.inputTokens;
    allMetadata[getConfig().OutputTokensColumnName] = metadata.outputTokens;
    allMetadata[getConfig().TotalTokensColumnName] = metadata.totalTokens;
    allMetadata[getConfig().ResponseTimeColumnName] = metadata.responseTime;
    allMetadata[getConfig().SafetyRatingsColumnName] = metadata.safetyRatings;
    allMetadata[getConfig().FinishReasonColumnName] = metadata.finishReason;
    allMetadata[getConfig().CitationMetadataColumnName] = metadata.citationMetadata;
    allMetadata[getConfig().ModelVersionColumnName] = metadata.modelVersion;
    allMetadata[getConfig().ResponseIdColumnName] = metadata.responseId;
    allMetadata[getConfig().ThoughtsTokenCountColumnName] = metadata.thoughtsTokenCount;
    allMetadata[getConfig().TextTokenCountColumnName] = metadata.textTokenCount;
    allMetadata[getConfig().ImageTokenCountColumnName] = metadata.imageTokenCount;
  }
  
  updateMetadata(sheet, row, allMetadata);
}

// Trigger: Process Gemini if status is 'NEW' and required columns are filled
function triggerGeminiProcessing() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  // Get all sheet data using helper function
  var data = getSheetData(masterSheet);
  
  for (var i = 1; i < data.length; i++) {
    var status = getValueFromDataByColumnName(data, i, masterSheet, getConfig().StatusColumnName);
    var flowchartUrl = getValueFromDataByColumnName(data, i, masterSheet, getConfig().UploadFlowchartColumnName);
    
    if (status === getConfig().NewEntryStatus && flowchartUrl) {
      processFlowchartWithGemini(masterSheet, data, i);
    }
  }
}

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
  var codeFileUrl = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().CodeFileUrlColumnName);
  if (!codeFileUrl) {
    console.log("No code file URL found for row: " + realRow);
    return false;
  }
  
  var code = getCodeFromDriveUrl(codeFileUrl);
  if (!code) {
    console.log("Failed to retrieve code from URL: " + codeFileUrl);
    return false;
  }
  
  var problemCode = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().ProblemNumberColumnName).split(" ")[0];
  var problemId = getProblemIdFromMeta(problemCode);
  
  if (!problemId) {
    console.log("No valid problem ID found for problem code: " + problemCode);
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
  
  updateMetadata(sheet, row, metadata);
}

// Trigger: Process DomJudge if status is 'GEMINI_DONE' and code is present
function triggerDomJudgeProcessing() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  // Get all sheet data using helper function
  var data = getSheetData(masterSheet);
  
  for (var i = 1; i < data.length; i++) {
    var status = getValueFromDataByColumnName(data, i, masterSheet, getConfig().StatusColumnName);
    
    if (status === getConfig().GeminiDoneStatus) {
      submitCodeToDomJudge(masterSheet, data, i);
    }
  }
}

/**
 * Polls DomJudge for a verdict on a submission.
 * @param {Sheet} sheet - The master sheet.
 * @param {Array[]} data - Sheet data as 2D array.
 * @param {number} rowIndex - Index of the row in data to process.
 * @return {boolean} - True if a verdict was retrieved.
 */
function pollVerdictForSubmission(sheet, data, rowIndex) {
  const realRow = rowIndex + 1; // 1-indexed for actual sheet operations
  
  // Extract submission ID
  var submissionId = getValueFromDataByColumnName(data, rowIndex, sheet, getConfig().SubmissionIdColumnName);
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
  
  updateMetadata(sheet, row, metadata);
}

// Trigger: Poll verdict if status is 'JUDGE_SUBMITTED' and submissionId is present
function triggerVerdictPolling() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  // Get all sheet data using helper function
  var data = getSheetData(masterSheet);
  
  for (var i = 1; i < data.length; i++) {
    var status = getValueFromDataByColumnName(data, i, masterSheet, getConfig().StatusColumnName);
    
    if (status === getConfig().JudgeSubmittedStatus) {
      pollVerdictForSubmission(masterSheet, data, i);
    }
  }
}
