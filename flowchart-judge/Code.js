const scriptProperties = PropertiesService.getScriptProperties();
const GEMINI_API_KEY = scriptProperties.getProperty(getConfig().geminiApiKeyProperty);
const JUDGE_API_URL = getConfig().domjudgeApiUrl;
const IMAGE_URL_COLUMN = 'F';

var domjudgeUrl = getConfig().domjudgeApiUrl;
var domjudgeUser = getConfig().domjudgeUser;
var domjudgePass = getConfig().domjudgePass;


function test() {
  Logger.log(GEMINI_API_KEY);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Evaluate Flowcharts')
    .addItem('Run on All Unprocessed Rows', 'processAllUnprocessedRows')
    .addToUi();
}


function onFormSubmit(e) {
  try {
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    var rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    var masterSheetName = getConfig().masterSheet;
    var masterSheet = getOrCreateSheet(masterSheetName, getConfig().masterSheetColumns);
    var timestamp = rowData[getColumnIndexByName(sheet, getConfig().masterSheetColumns[0]) - 1];
    var email = rowData[getColumnIndexByName(sheet, getConfig().masterSheetColumns[1]) - 1];
    var problemCode = rowData[getColumnIndexByName(sheet, getConfig().masterSheetColumns[2]) - 1];
    var flowchartUrl = rowData[getColumnIndexByName(sheet, getConfig().masterSheetColumns[3]) - 1];
    var problemId = getProblemIdFromMeta(problemCode);
    // Initial status value (e.g. 'NEW')
    var newRow = [timestamp, email, problemCode, flowchartUrl, 'NEW', '', '', '', ''];
    masterSheet.appendRow(newRow);
  } catch (err) {
    logEvent("Error in onFormSubmit: " + err.message, getConfig().logLevelError);
  }
}

// Trigger: Process Gemini if status is 'NEW' and required columns are filled
function triggerGeminiProcessing() {
  var masterSheet = getOrCreateSheet(getConfig().masterSheet, getConfig().masterSheetColumns);
  var data = masterSheet.getDataRange().getValues();
  var statusCol = getColumnIndexByName(masterSheet, 'Status');
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var flowchartUrl = data[i][getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[3]) - 1];
    if (status === 'NEW' && flowchartUrl) {
      var promptText = getPrompt();
      var fileId = getFileIdFromUrl(flowchartUrl);
      var code = '';
      var newStatus = 'GEMINI_DONE';
      if (fileId) {
        var gemResult = callGeminiWithDrivePDF(fileId, promptText, 0);
        if (gemResult) {
          code = gemResult;
          newStatus = 'GEMINI_DONE';
        }
      }
      masterSheet.getRange(i + 1, statusCol).setValue(newStatus);
      masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[5])).setValue(code);
    }
  }
}

// Trigger: Process DomJudge if status is 'GEMINI_DONE' and code is present
function triggerDomJudgeProcessing() {
  var masterSheet = getOrCreateSheet(getConfig().masterSheet, getConfig().masterSheetColumns);
  var data = masterSheet.getDataRange().getValues();
  var statusCol = getColumnIndexByName(masterSheet, 'Status');
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var code = data[i][getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[5]) - 1];
    var problemCode = data[i][getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[2]) - 1];
    var problemId = getProblemIdFromMeta(problemCode);
    if (status === 'GEMINI_DONE' && code && problemId) {
      var submissionId = getResultFromDomjudge(code, problemId);
      masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[6])).setValue(submissionId);
      masterSheet.getRange(i + 1, statusCol).setValue('JUDGE_SUBMITTED');
    }
  }
}

// Trigger: Poll verdict if status is 'JUDGE_SUBMITTED' and submissionId is present
function triggerVerdictPolling() {
  var masterSheet = getOrCreateSheet(getConfig().masterSheet, getConfig().masterSheetColumns);
  var data = masterSheet.getDataRange().getValues();
  var statusCol = getColumnIndexByName(masterSheet, 'Status');
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var submissionId = data[i][getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[6]) - 1];
    if (status === 'JUDGE_SUBMITTED' && submissionId) {
      var result = pollJudgement(submissionId);
      if (result && result.length > 0 && result[0].judgement_type_id) {
        masterSheet.getRange(i + 1, getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[7])).setValue(result[0].judgement_type_id);
        masterSheet.getRange(i + 1, statusCol).setValue('VERDICT_READY');
      }
    }
  }
}

function processAllUnprocessedRows() {
  // Select correct Sheet and data range

  // Iterate over rows, if that row is unprocessed, call AI and convert it to code
}

function processRow(sheet, row) {
  const imageUrl = sheet.getRange(row, IMAGE_URL_COLUMN).getValue();

  if (!imageUrl) {
    return false;
  }

  const gemResult = getResultFromGemini(imageUrl);
  if (!gemResult) {
    Logger.log("Empty response from AI.");
    return false;
  };
  const code = getCodeFromAIResult(gemResult);
  saveCode(code);

  const judgeResult = callJudgeService(code, problemId);
  saveJudgeResult(judgeResult);
}




