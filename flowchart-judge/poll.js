// Batch polling: fetch all judgements for the contest and match to in-progress submissionIds
function pollJudgement(submissionId) {
  var contestId = getConfig().domjudgeContestId;
  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeAdminUser;
  var domjudgePass = getConfig().domjudgeAdminPass;
  var url = domjudgeUrl + "/contests/" + contestId + "/judgements";
  console.log("Polling all judgements. URL: " + url);
  logEvent("Polling all judgements. URL: " + url, getConfig().logLevelDebug);
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
      var allJudgements = JSON.parse(response.getContentText()); // array of judgements
      logEvent("Got " + allJudgements.length + " judgements", getConfig().logLevelDebug);
      for (var i = 0; i < allJudgements.length; i++) {
        var j = allJudgements[i];
        if (j.submission_id === String(submissionId)) {
          console.log(j.judgement_type_id)
          return j.judgement_type_id;
        }else{
          console.log("j.submission_id: ",typeof(j.submission_id),"submissionId :",  typeof(submissionId),j.submission_id === String(submissionId))
        }
      }
      console.log(allJudgements)
      return null;
    } else {
      logEvent("Error polling all judgements: " + code + " - " + response.getContentText(), getConfig().logLevelError);
      return null;
    }
  } catch (e) {
    logEvent("Exception while polling all judgements: " + e.toString(), getConfig().logLevelError);
    return null;
  }
}
