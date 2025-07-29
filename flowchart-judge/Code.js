const scriptProperties = PropertiesService.getScriptProperties();
const GEMINI_API_KEY = scriptProperties.getProperty('GEM_API_KEY');
const JUDGE_API_URL = 'https://judge.csbasics.in/api/v4';
const IMAGE_URL_COLUMN = 'F';

var domjudgeUrl = "https://judge.csbasics.in"; // Replace with your actual URL
var domjudgeUser = "student01"; // From Settings.DOMJUDGE_USER
var domjudgePass = "Ppassword@123"; // From Settings.DOMJUDGE_PASS


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
    var masterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(masterSheetName);
    if (!masterSheet) {
      masterSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(masterSheetName);
      masterSheet.appendRow(['Timestamp', 'Email Address', 'Problem Number', 'Upload your Flowchart', 'Status', 'Generated Code', 'Submission ID', 'Verdict']);
    }
    var timestamp = rowData[getColumnIndexByName(sheet, 'Timestamp') - 1];
    var email = rowData[getColumnIndexByName(sheet, 'Email Address') - 1];
    var problemCode = rowData[getColumnIndexByName(sheet, 'Problem Number') - 1];
    var flowchartUrl = rowData[getColumnIndexByName(sheet, 'Upload your Flowchart') - 1];
    var problemId = getProblemIdFromMeta(problemCode);
    var newRow = [timestamp, email, problemCode, flowchartUrl, '', '', '', ''];
    masterSheet.appendRow(newRow);
    var masterRow = masterSheet.getLastRow();
    var code = '';
    var status = 'not done';
    var promptText = getPrompt();
    var fileId = getFileIdFromUrl(flowchartUrl);
    if (!fileId) {
      logEvent("Invalid flowchart URL: " + flowchartUrl, getConfig().logLevelError);
      masterSheet.getRange(masterRow, getColumnIndexByName(masterSheet, 'Status')).setValue('error');
      return;
    }
    if (flowchartUrl) {
      var gemResult = callGeminiWithDrivePDF(fileId, promptText, 0);
      if (gemResult) {
        code = gemResult;
        status = 'done';
      }
    }
    masterSheet.getRange(masterRow, getColumnIndexByName(masterSheet, 'Status')).setValue(status);
    masterSheet.getRange(masterRow, getColumnIndexByName(masterSheet, 'Generated Code')).setValue(code);
    if (code && problemId) {
      var submissionId = getResultFromDomjudge(code, problemId);
      masterSheet.getRange(masterRow, getColumnIndexByName(masterSheet, 'Submission ID')).setValue(submissionId);
    }
  } catch (err) {
    logEvent("Error in onFormSubmit: " + err.message, getConfig().logLevelError);
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




