function test() {
  const scriptProperties = PropertiesService.getScriptProperties();
  Logger.log("Script properties loaded successfully.");
  Logger.log("GEMINI_API_KEY: Config Key " + getConfig().geminiApiKeyProperty);
  const GEMINI_API_KEY = scriptProperties.getProperty(getConfig().geminiApiKeyProperty);
  const JUDGE_API_URL = getConfig().domjudgeApiUrl;
  const IMAGE_URL_COLUMN = "F";

  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeUser;
  var domjudgePass = getConfig().domjudgePass;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Evaluate Flowcharts")
    .addItem("Run on All Unprocessed Rows", "processAllUnprocessedRows")
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
        getColumnIndexByName(sheet, getConfig().masterSheetColumns[0]) - 1
      ];
    var email =
      rowData[
        getColumnIndexByName(sheet, getConfig().masterSheetColumns[1]) - 1
      ];
    var problemCode =
      rowData[
        getColumnIndexByName(sheet, getConfig().masterSheetColumns[2]) - 1
      ];
    var flowchartUrl =
      rowData[
        getColumnIndexByName(sheet, getConfig().masterSheetColumns[3]) - 1
      ];
    // Initial status value (e.g. 'NEW')
    var newRow = [
      timestamp,
      email,
      problemCode,
      flowchartUrl,
      "NEW",
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
  var statusCol = getColumnIndexByName(masterSheet, "Status");
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var flowchartUrl =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[3]) - 1
      ];
    if (status === "NEW" && flowchartUrl) {
      var promptText = getPrompt();
      var fileId = getFileIdFromUrl(flowchartUrl);
      var code = "";
      var newStatus = "GEMINI_DONE";
      if (fileId) {
        var gemResult = callGeminiWithDrivePDF(fileId, promptText, 0);
        if (gemResult) {
          code = gemResult;
          newStatus = "GEMINI_DONE";
        }
      }
      masterSheet.getRange(i + 1, statusCol).setValue(newStatus);
      masterSheet
        .getRange(
          i + 1,
          getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[5])
        )
        .setValue(code);
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
  var statusCol = getColumnIndexByName(masterSheet, "Status");
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var code =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[5]) - 1
      ];
    var problemCode =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[2]) - 1
      ].split(" ")[0]; // Assuming problem code is the first part
    var problemId = getProblemIdFromMeta(problemCode);
    if (status === "GEMINI_DONE" && code && problemId) {
      var submissionId = submitToDomjudge(code, problemId);
      console.log("submission successful:"+submissionId)
      masterSheet
        .getRange(
          i + 1,
          getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[6])
        )
        .setValue(submissionId);
      masterSheet.getRange(i + 1, statusCol).setValue("JUDGE_SUBMITTED");
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
  var statusCol = getColumnIndexByName(masterSheet, "Status");
  for (var i = 1; i < data.length; i++) {
    var status = data[i][statusCol - 1];
    var submissionId =
      data[i][
        getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[6]) - 1
      ];
    if (status === "JUDGE_SUBMITTED" && submissionId) {
      var result = pollJudgement(submissionId);
      if (result) {
        masterSheet
          .getRange(
            i + 1,
            getColumnIndexByName(masterSheet, getConfig().masterSheetColumns[7])
          )
          .setValue(result);
        masterSheet.getRange(i + 1, statusCol).setValue("VERDICT_READY");
      }
    }
  }
}
