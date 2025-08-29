// Batch polling: fetch all judgements for the contest and match to in-progress submissionIds
function pollJudgement(submissionId) {
  var contestId = getConfig().domjudgeContestId;
  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeAdminUser;
  var domjudgePass = getConfig().domjudgeAdminPass;
  var url = domjudgeUrl + "/contests/" + contestId + "/judgements?submission_id=" + encodeURIComponent(submissionId) + "&strict=false";
  console.log("Polling judgements for submission. URL: " + url);
  logEvent("Polling judgements for submission. URL: " + url, getConfig().logLevelDebug);
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
      var judgements = JSON.parse(response.getContentText()); // array of judgements
      logEvent("Got " + judgements.length + " judgements for submission " + submissionId, getConfig().logLevelDebug);
      if (judgements.length > 0) {
        var j = judgements[0];
        console.log(j.judgement_type_id);
        return j.judgement_type_id;
      }
      return null;
    } else {
      logEvent("Error polling judgements: " + code + " - " + response.getContentText(), getConfig().logLevelError);
      return null;
    }
  } catch (e) {
    logEvent("Exception while polling judgements: " + e.toString(), getConfig().logLevelError);
    return null;
  }
}
