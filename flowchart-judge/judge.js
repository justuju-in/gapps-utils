function getResultFromDomjudge(code, problemId) {
  var cid = getConfig().domjudgeContestId;
  var languageId = "python3";
  var filename = "solution.py";
  var teamId = getConfig().domjudgeTeamId;
  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeUser;
  var domjudgePass = getConfig().domjudgePass;

  // Base64 encode the Python code directly (not zipped)
  var encodedCode = Utilities.base64Encode(code);

  var url = domjudgeUrl + "/contests/" + cid + "/submissions";

  var payload = {
    problem_id: String(problemId),
    language_id: languageId,
    team_id: teamId,
    files: [
      {
        filename: filename,
        data: encodedCode,
      },
    ],
  };

  var headers = {
    "Authorization": "Basic " + Utilities.base64Encode(domjudgeUser + ":" + domjudgePass),
    "Content-Type": "application/json"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

    if (code === 200 || code === 201) {
      var json = JSON.parse(response.getContentText());
      logEvent("Successfully submitted. Judge ID: " + json.id, getConfig().logLevelDebug);
      return json.id;
    } else {
      logEvent("DomJudge Error: " + code + " - " + response.getContentText(), getConfig().logLevelError);
      return "";
    }
  } catch (e) {
    logEvent("Exception while submitting to DomJudge: " + e.toString(), getConfig().logLevelError);
    return "";
  }
}
