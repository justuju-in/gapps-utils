/**
 * Service for processing flowcharts with Gemini API.
 * This file handles the high-level orchestration of Gemini processing workflows.
 * Low-level implementation details are in gemini.js.
 */

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
  const submissionData = extractSubmissionData(sheet, data, rowIndex);
  if (!submissionData || !submissionData.fileId) {
    return false;
  }
  
  // Save image MIME type
  const mimeType = getImageMimeType(submissionData.fileId);
  setCellValueByColumnName(sheet, realRow, getConfig().ImageMimeTypeColumnName, mimeType);
  
  // Process with Gemini using our centralized image processing function
  const gemResult = processGeminiImageRequest(
    submissionData.fileId, 
    getPrompt(), 
    getConfig().geminiTemperature
  );
  
  if (!gemResult) {
    logEvent("Gemini processing failed for row: " + realRow, getConfig().logLevelError);
    return false;
  }
  
  // Extract and clean code
  const code = gemResult.content;
  
  // Save code and get URL
  const generationTimestamp = new Date();
  const codeFileUrl = saveGeneratedCode(
    code,
    submissionData.email,
    submissionData.problemId,
    generationTimestamp
  );
  
  if (!codeFileUrl) {
    logEvent("Failed to save code to Drive for row: " + realRow, getConfig().logLevelError);
    return false;
  }
  
  // Save all metadata (basic and extended)
  saveGeminiMetadata(sheet, realRow, codeFileUrl, generationTimestamp, gemResult.metadata);
  
  // Update status
  setCellValueByColumnName(sheet, realRow, getConfig().StatusColumnName, getConfig().GeminiDoneStatus);
  
  return true;
}

/**
 * Extracts all necessary data from a submission row.
 * 
 * @param {Sheet} sheet - The master sheet
 * @param {Array[]} data - Sheet data as 2D array
 * @param {number} rowIndex - Index of the row in data to process
 * @returns {Object|null} Submission data or null if invalid
 */
function extractSubmissionData(sheet, data, rowIndex) {
  const flowchartUrl = getValueFromDataByColumnName(
    data, rowIndex, sheet, getConfig().UploadFlowchartColumnName
  );
  
  const fileId = getFileIdFromUrl(flowchartUrl);
  if (!fileId) {
    logEvent("Invalid fileId for flowchart URL: " + flowchartUrl, getConfig().logLevelError);
    return null;
  }
  
  const email = getValueFromDataByColumnName(
    data, rowIndex, sheet, getConfig().EmailAddressColumnName
  );
  
  const problemCode = getValueFromDataByColumnName(
    data, rowIndex, sheet, getConfig().ProblemNumberColumnName
  );
  
  // Extract just the problem code part (e.g., "FCP045" from "FCP045 - Title")
  const problemCodePart = problemCode.split(" ")[0].trim();
  const problemId = getProblemIdFromMeta(problemCodePart);
  
  return {
    fileId: fileId,
    email: email,
    problemCode: problemCodePart,
    problemId: problemId
  };
}

/**
 * Saves generated code to Drive and returns the URL.
 * 
 * @param {string} code - The generated code to save
 * @param {string} email - User email 
 * @param {string|number} problemId - Problem ID
 * @param {Date} timestamp - Generation timestamp
 * @returns {string|null} URL to saved file or null if failed
 */
function saveGeneratedCode(code, email, problemId, timestamp) {
  try {
    return saveCodeToDrive(timestamp, email, problemId, code);
  } catch (e) {
    logEvent("Failed to save code to Drive: " + e.toString(), getConfig().logLevelError);
    return null;
  }
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
  // Create basic metadata object
  const allMetadata = createBasicMetadata(codeFileUrl, timestamp);
  
  // Add detailed Gemini API response metadata if available
  if (metadata) {
    Object.assign(allMetadata, createDetailedMetadata(metadata));
  }
  
  // Update the sheet with all metadata
  updateSheetMetadata(sheet, row, allMetadata);
}

/**
 * Creates a basic metadata object with essential generation information.
 * 
 * @param {string} codeFileUrl - URL to the generated code file
 * @param {Date} timestamp - Generation timestamp
 * @returns {Object} Basic metadata object
 */
function createBasicMetadata(codeFileUrl, timestamp) {
  return {
    [getConfig().CodeFileUrlColumnName]: codeFileUrl,
    [getConfig().ModelUsedColumnName]: getConfig().geminiModel,
    [getConfig().PromptVersionColumnName]: getConfig().promptVersion,
    [getConfig().GenerationTimestampColumnName]: timestamp
  };
}

/**
 * Creates a detailed metadata object from Gemini API response metadata.
 * 
 * @param {Object} metadata - Metadata from Gemini API response
 * @returns {Object} Detailed metadata object mapped to config column names
 */
function createDetailedMetadata(metadata) {
  return {
    [getConfig().InputTokensColumnName]: metadata.inputTokens,
    [getConfig().OutputTokensColumnName]: metadata.outputTokens,
    [getConfig().TotalTokensColumnName]: metadata.totalTokens,
    [getConfig().ResponseTimeColumnName]: metadata.responseTime,
    [getConfig().SafetyRatingsColumnName]: metadata.safetyRatings,
    [getConfig().FinishReasonColumnName]: metadata.finishReason,
    [getConfig().CitationMetadataColumnName]: metadata.citationMetadata,
    [getConfig().ModelVersionColumnName]: metadata.modelVersion,
    [getConfig().ResponseIdColumnName]: metadata.responseId,
    [getConfig().ThoughtsTokenCountColumnName]: metadata.thoughtsTokenCount,
    [getConfig().TextTokenCountColumnName]: metadata.textTokenCount,
    [getConfig().ImageTokenCountColumnName]: metadata.imageTokenCount
  };
}

/**
 * Triggers Gemini processing for all eligible entries in the master sheet.
 */
function triggerGeminiProcessing() {
  // Get master sheet and data
  const masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  const data = getSheetData(masterSheet);
  
  // Find eligible rows for processing
  const eligibleRows = findEligibleRows(masterSheet, data);
  
  // Process each eligible row
  eligibleRows.forEach(rowIndex => {
    processFlowchartWithGemini(masterSheet, data, rowIndex);
  });
}

/**
 * Finds rows that are eligible for Gemini processing.
 * 
 * @param {Sheet} sheet - The master sheet
 * @param {Array[]} data - Sheet data as 2D array
 * @returns {number[]} Array of eligible row indices
 */
function findEligibleRows(sheet, data) {
  const eligibleRows = [];
  
  for (let i = 1; i < data.length; i++) {
    const status = getValueFromDataByColumnName(
      data, i, sheet, getConfig().StatusColumnName
    );
    
    const flowchartUrl = getValueFromDataByColumnName(
      data, i, sheet, getConfig().UploadFlowchartColumnName
    );
    
    if (status === getConfig().NewEntryStatus && flowchartUrl) {
      eligibleRows.push(i);
    }
  }
  
  return eligibleRows;
}



/**
 * Note: Low-level Gemini API functions have been moved to gemini.js
 * This file now focuses only on orchestrating the workflow and integrating with the sheet.
 * This separation of concerns makes the code more maintainable and reusable.
 */
