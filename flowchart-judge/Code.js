function test() {
  const scriptProperties = PropertiesService.getScriptProperties();
  Logger.log("Script properties loaded successfully.");
  Logger.log("GEMINI_API_KEY: Config Key " + getConfig().geminiApiKeyProperty);
  const GEMINI_API_KEY = scriptProperties.getProperty(getConfig().geminiApiKeyProperty);
  const JUDGE_API_URL = getConfig().domjudgeApiUrl;

  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeUser;
  var domjudgePass = getConfig().domjudgePass;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Evaluate Flowcharts")
    .addItem("Run on All Unprocessed Rows", "processAllUnprocessedRows")
    .addItem("Process Gemini", "triggerGeminiProcessing")
    .addItem("Process DomJudge", "triggerDomJudgeProcessing")
    .addItem("Poll Verdict", "triggerVerdictPolling")
    .addToUi();
}

function onFormSubmit(e) {
  try {
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    var rowData = sheet
      .getRange(row, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    var masterSheetName = getConfig().masterSheet;
    var masterSheet = getOrCreateSheet(
      masterSheetName,
      getConfig().masterSheetColumns
    );
    var timestamp =
      rowData[
        getColumnIndexByName(sheet, getConfig().TimestampColumnName) - 1
      ];
    var email =
      rowData[
        getColumnIndexByName(sheet, getConfig().EmailAddressColumnName) - 1
      ];
    var problemCode =
      rowData[
        getColumnIndexByName(sheet, getConfig().ProblemNumberColumnName) - 1
      ];
    var flowchartUrl =
      rowData[
        getColumnIndexByName(sheet, getConfig().UploadFlowchartColumnName) - 1
      ];
    // Initial status value (e.g. 'NEW')
    var newRow = [
      timestamp,
      email,
      problemCode,
      flowchartUrl,
      getConfig().NewEntryStatus,
      "",
      "",
      "",
      "",
    ];
    masterSheet.appendRow(newRow);
  } catch (err) {
    logEvent(
      "Error in onFormSubmit: " + err.message,
      getConfig().logLevelError
    );
  }
}

// Trigger: Process Gemini if status is 'NEW' and required columns are filled
function triggerGeminiProcessing() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  var data = masterSheet.getDataRange().getValues();
  var statusCol = getColumnIndexByName(masterSheet, getConfig().StatusColumnName);
  
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var flowchartUrl =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().UploadFlowchartColumnName) - 1
      ];
    
    if (status === getConfig().NewEntryStatus && flowchartUrl) {
      var promptText = getPrompt();
      var fileId = getFileIdFromUrl(flowchartUrl);
      var code = "";
      var newStatus = getConfig().GeminiDoneStatus;
      var generationTimestamp = new Date();
      
      if (fileId) {
        var gemResult = callGeminiWithDrivePDF(fileId, promptText, getConfig().geminiTemperature);
        // Capture and save the MIME type of the uploaded flowchart
        const mimeType = getImageMimeType(fileId);
        masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ImageMimeTypeColumnName)).setValue(mimeType);
        if (gemResult && gemResult.content) {
          code = cleanCodeBlock(gemResult.content);
          newStatus = getConfig().GeminiDoneStatus;
          
          // Save code to Drive and get URL
          var timestamp = data[i][getColumnIndexByName(masterSheet, getConfig().TimestampColumnName) - 1];
          var email = data[i][getColumnIndexByName(masterSheet, getConfig().EmailAddressColumnName) - 1];
          var problemCode = data[i][getColumnIndexByName(masterSheet, getConfig().ProblemNumberColumnName) - 1];
          var problemId = getProblemIdFromMeta(problemCode.split(" ")[0]);
          var codeFileUrl = saveCodeToDrive(timestamp, email, problemId, code);
          
          // Update all metadata columns
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().CodeFileUrlColumnName)).setValue(codeFileUrl);
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ModelUsedColumnName)).setValue(getConfig().geminiModel);
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().PromptVersionColumnName)).setValue(getConfig().promptVersion);
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().GenerationTimestampColumnName)).setValue(generationTimestamp);
          
          // Save Gemini response metadata
          if (gemResult.metadata) {
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().InputTokensColumnName)).setValue(gemResult.metadata.inputTokens);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().OutputTokensColumnName)).setValue(gemResult.metadata.outputTokens);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().TotalTokensColumnName)).setValue(gemResult.metadata.totalTokens);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ResponseTimeColumnName)).setValue(gemResult.metadata.responseTime);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().SafetyRatingsColumnName)).setValue(gemResult.metadata.safetyRatings);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().FinishReasonColumnName)).setValue(gemResult.metadata.finishReason);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().CitationMetadataColumnName)).setValue(gemResult.metadata.citationMetadata);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ModelVersionColumnName)).setValue(gemResult.metadata.modelVersion);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ResponseIdColumnName)).setValue(gemResult.metadata.responseId);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ThoughtsTokenCountColumnName)).setValue(gemResult.metadata.thoughtsTokenCount);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().TextTokenCountColumnName)).setValue(gemResult.metadata.textTokenCount);
            masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ImageTokenCountColumnName)).setValue(gemResult.metadata.imageTokenCount);
          }
        } else if (gemResult) {
          // Handle backward compatibility with old response format
          code = cleanCodeBlock(gemResult);
          newStatus = getConfig().GeminiDoneStatus;
          
          // Save code to Drive and get URL
          var timestamp = data[i][getColumnIndexByName(masterSheet, getConfig().TimestampColumnName) - 1];
          var email = data[i][getColumnIndexByName(masterSheet, getConfig().EmailAddressColumnName) - 1];
          var problemCode = data[i][getColumnIndexByName(masterSheet, getConfig().ProblemNumberColumnName) - 1];
          var problemId = getProblemIdFromMeta(problemCode.split(" ")[0]);
          var codeFileUrl = saveCodeToDrive(timestamp, email, problemId, code);
          
          // Update basic metadata columns
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().CodeFileUrlColumnName)).setValue(codeFileUrl);
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().ModelUsedColumnName)).setValue(getConfig().geminiModel);
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().PromptVersionColumnName)).setValue(getConfig().promptVersion);
          masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().GenerationTimestampColumnName)).setValue(generationTimestamp);
          
        }
      }
      
      // Update status
      masterSheet.getRange(i + 1, statusCol).setValue(newStatus);
    }
  }
}

// Trigger: Process DomJudge if status is 'GEMINI_DONE' and code is present
function triggerDomJudgeProcessing() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  var data = masterSheet.getDataRange().getValues();
  var statusCol = getColumnIndexByName(masterSheet, getConfig().StatusColumnName);
  
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var codeFileUrl = data[i][getColumnIndexByName(masterSheet, getConfig().CodeFileUrlColumnName) - 1];
    var code = codeFileUrl ? getCodeFromDriveUrl(codeFileUrl) : "";
    var problemCode =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().ProblemNumberColumnName) - 1
      ].split(" ")[0]; // Assuming problem code is the first part
    var problemId = getProblemIdFromMeta(problemCode);
    
    if (status === getConfig().GeminiDoneStatus && code && problemId) {
      var submissionTimestamp = new Date();
      var submissionId = submitToDomjudge(code, problemId);
      console.log("submission successful:" + submissionId);
      
      if (submissionId) {
        // Update submission metadata
        masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().SubmissionIdColumnName)).setValue(submissionId);
        masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().SubmissionTimestampColumnName)).setValue(submissionTimestamp);
        masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().SubmissionStatusColumnName)).setValue(getConfig().SubmissionStatus);
        masterSheet.getRange(i + 1, statusCol).setValue(getConfig().JudgeSubmittedStatus);
      }
    }
    else{
      console.log("status: ",status);
      console.log("code: ",code);
      console.log("problemId: ",problemId)
    }
  }
}

// Trigger: Poll verdict if status is 'JUDGE_SUBMITTED' and submissionId is present
function triggerVerdictPolling() {
  var masterSheet = getOrCreateSheet(
    getConfig().masterSheet,
    getConfig().masterSheetColumns
  );
  var data = masterSheet.getDataRange().getValues();
  var statusCol = getColumnIndexByName(masterSheet, getConfig().StatusColumnName);
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var submissionId =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().SubmissionIdColumnName) - 1
      ];
    if (status === getConfig().JudgeSubmittedStatus && submissionId) {
      var result = pollJudgement(submissionId);
      if (result) {
        masterSheet
          .getRange(
            i + 1,
            getColumnIndexByName(masterSheet, getConfig().VerdictColumnName)
          )
          .setValue(result);
        masterSheet.getRange(i + 1, statusCol).setValue(getConfig().VerdictReadyStatus);
      }
    }
  }
}
