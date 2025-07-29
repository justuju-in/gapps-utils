// poll.js - verdict polling logic for DomJudge
// Each function is independent and reusable

function pollJudgement(submissionId) {
  var contestId = getConfig().domjudgeContestId;
  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeUser;
  var domjudgePass = getConfig().domjudgePass;

  var url = domjudgeUrl + "/contests/" + contestId + "/submissions/" + submissionId + "/judgements";
  var headers = {
    "Authorization": "Basic " + Utilities.base64Encode(domjudgeUser + ":" + domjudgePass),
    "Content-Type": "application/json"
  };
  var options = {
    method: "get",
    headers: headers,
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code === 200) {
      var json = JSON.parse(response.getContentText());
      logEvent("Judgement result: " + JSON.stringify(json), getConfig().logLevelDebug);
      return json;
    } else {
      logEvent("Error polling judgement: " + code + " - " + response.getContentText(), getConfig().logLevelError);
      return null;
    }
  } catch (e) {
    logEvent("Exception while polling judgement: " + e.toString(), getConfig().logLevelError);
    return null;
  }
}

function pollVerdicts() {
  var masterSheetName = getConfig().masterSheet;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(masterSheetName);
  if (!masterSheet) return;
  var data = masterSheet.getDataRange().getValues();
  var subIdCol = getColumnIndexByName(masterSheet, 'Submission ID');
  var verdictCol = getColumnIndexByName(masterSheet, 'Verdict');
  for (var i = 1; i < data.length; i++) { // skip header
    var submissionId = data[i][subIdCol - 1];
    var verdict = data[i][verdictCol - 1];
    if (submissionId && !verdict) {
      var result = pollJudgement(submissionId);
      if (result && result.length > 0 && result[0].judgement_type_id) {
        masterSheet.getRange(i + 1, verdictCol).setValue(result[0].judgement_type_id);
        logEvent("Verdict updated for submission " + submissionId + ": " + result[0].judgement_type_id, getConfig().logLevelDebug);
      }
    }
  }
}
