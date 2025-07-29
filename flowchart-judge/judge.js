function submitToDomjudge(code, problemId) {
  var cid = getConfig().domjudgeContestId;
  var languageId = "python3";
  var filename = "solution.py";
  var teamId = getConfig().domjudgeTeamId;
  var domjudgeUrl = getConfig().domjudgeApiUrl;
  var domjudgeUser = getConfig().domjudgeUser;
  var domjudgePass = getConfig().domjudgePass;

  // Create a blob for the code file
  var codeBlob = Utilities.newBlob(code, 'text/x-python', filename);
  // Zip the blob
  var zipBlob = Utilities.zip([codeBlob], 'solution.zip');
  // Base64 encode the zipped blob
  var encodedZip = Utilities.base64Encode(zipBlob.getBytes());

  var url = domjudgeUrl + "/contests/" + cid + "/submissions";

  var payload = {
    problem_id: String(problemId),
    language_id: languageId,
    team_id: teamId,
    files: [
      {
        filename: 'solution.zip',
        data: encodedZip,
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
      console.log("Submission successful: " + JSON.stringify(json));
      // Return the submission ID for further processing
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
