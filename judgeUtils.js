/**
 * Utility functions for interacting with the DomJudge system.
 */

/**
 * Creates a code blob for DomJudge submission.
 * @param {string} code - The code content.
 * @param {string} filename - The filename to use.
 * @returns {Blob} The code blob.
 */
function createCodeBlob(code, filename) {
  return Utilities.newBlob(code, 'text/x-python', filename);
}

/**
 * Creates a zip file containing code files for DomJudge submission.
 * @param {Blob[]} codeBlobs - Array of code blobs to zip.
 * @param {string} zipFilename - The name for the zip file.
 * @returns {Blob} The zipped blob.
 */
function createZipBlob(codeBlobs, zipFilename) {
  return Utilities.zip(codeBlobs, zipFilename);
}

/**
 * Base64 encodes a blob for submission.
 * @param {Blob} blob - The blob to encode.
 * @returns {string} The base64 encoded string.
 */
function encodeBlob(blob) {
  return Utilities.base64Encode(blob.getBytes());
}

/**
 * Creates the DomJudge submission URL.
 * @param {string} baseUrl - The base API URL.
 * @param {string} contestId - The contest ID.
 * @returns {string} The full submission URL.
 */
function createDomjudgeSubmissionUrl(baseUrl, contestId) {
  return `${baseUrl}/contests/${contestId}/submissions`;
}

/**
 * Creates the authentication header for DomJudge API.
 * @param {string} username - The DomJudge username.
 * @param {string} password - The DomJudge password.
 * @returns {string} The authorization header value.
 */
function createDomjudgeAuthHeader(username, password) {
  return "Basic " + Utilities.base64Encode(username + ":" + password);
}

/**
 * Creates the payload for a DomJudge submission.
 * @param {string} problemId - The problem ID.
 * @param {string} languageId - The language ID.
 * @param {string} teamId - The team ID.
 * @param {string} zipFilename - The zip filename.
 * @param {string} encodedZip - The base64 encoded zip data.
 * @returns {Object} The submission payload.
 */
function createDomjudgeSubmissionPayload(problemId, languageId, teamId, zipFilename, encodedZip) {
  return {
    problem_id: String(problemId),
    language_id: languageId,
    team_id: teamId,
    files: [
      {
        filename: zipFilename,
        data: encodedZip,
      },
    ],
  };
}

/**
 * Creates the options for the DomJudge API request.
 * @param {Object} headers - The request headers.
 * @param {Object} payload - The request payload.
 * @returns {Object} The fetch options.
 */
function createDomjudgeFetchOptions(headers, payload) {
  return {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

/**
 * Makes a request to the DomJudge API.
 * @param {string} url - The API URL.
 * @param {Object} options - The fetch options.
 * @returns {Object} Object containing response code, body, and parsed JSON if successful.
 */
function makeDomjudgeRequest(url, options) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    return {
      success: responseCode === 200 || responseCode === 201,
      code: responseCode,
      body: responseBody,
      json: responseCode === 200 || responseCode === 201 ? JSON.parse(responseBody) : null
    };
  } catch (e) {
    logEvent("DomJudge API request error: " + e.toString(), getConfig().logLevelError);
    return { success: false, code: 500, body: e.toString(), json: null };
  }
}

/**
 * Submits code to the DomJudge system.
 * @param {string} code - The code content to submit.
 * @param {string} problemId - The ID of the problem to submit for.
 * @returns {string} The submission ID if successful, or an empty string if failed.
 */
function submitToDomjudge(code, problemId) {
  // Get configuration values
  const cid = getConfig().domjudgeContestId;
  const languageId = getConfig().domjudgeLanguageId;
  const filename = getConfig().domjudgeSolutionFilename;
  const teamId = getConfig().domjudgeTeamId;
  const domjudgeUrl = getConfig().domjudgeApiUrl;
  const domjudgeUser = getConfig().domjudgeUser;
  const domjudgePass = getConfig().domjudgePass;
  const zipFilename = getConfig().domjudgeZipFilename;

  try {
    // Create and prepare the submission file
    const codeBlob = createCodeBlob(code, filename);
    const zipBlob = createZipBlob([codeBlob], zipFilename);
    const encodedZip = encodeBlob(zipBlob);
    
    // Create submission URL and auth header
    const url = createDomjudgeSubmissionUrl(domjudgeUrl, cid);
    const authHeader = createDomjudgeAuthHeader(domjudgeUser, domjudgePass);
    
    // Create headers and payload
    const headers = {
      "Authorization": authHeader,
      "Content-Type": "application/json"
    };
    
    const payload = createDomjudgeSubmissionPayload(
      problemId, languageId, teamId, zipFilename, encodedZip
    );
    
    // Create fetch options and make request
    const options = createDomjudgeFetchOptions(headers, payload);
    const response = makeDomjudgeRequest(url, options);
    
    if (response.success) {
      logEvent("Successfully submitted. Judge ID: " + response.json.id, getConfig().logLevelDebug);
      console.log("Submission successful: " + JSON.stringify(response.json));
      return response.json.id;
    } else {
      logEvent("DomJudge Error: " + response.code + " - " + response.body, getConfig().logLevelError);
      return "";
    }
  } catch (e) {
    logEvent("Exception while submitting to DomJudge: " + e.toString(), getConfig().logLevelError);
    return "";
  }
}

/**
 * Creates the DomJudge judgements URL.
 * @param {string} baseUrl - The base API URL.
 * @param {string} contestId - The contest ID.
 * @returns {string} The judgements URL.
 */
function createDomjudgeJudgementsUrl(baseUrl, contestId) {
  return `${baseUrl}/contests/${contestId}/judgements`;
}

/**
 * Creates the options for a GET request to DomJudge API.
 * @param {Object} headers - The request headers.
 * @returns {Object} The fetch options.
 */
function createDomjudgeGetOptions(headers) {
  return {
    method: "get",
    headers: headers,
    muteHttpExceptions: true
  };
}

/**
 * Makes a GET request to the DomJudge API.
 * @param {string} url - The API URL.
 * @param {Object} options - The fetch options.
 * @returns {Object} Object containing response code, body, and parsed JSON if successful.
 */
function fetchDomjudgeData(url, options) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    return {
      success: responseCode === 200,
      code: responseCode,
      body: responseBody,
      json: responseCode === 200 ? JSON.parse(responseBody) : null
    };
  } catch (e) {
    logEvent("DomJudge API fetch error: " + e.toString(), getConfig().logLevelError);
    return { success: false, code: 500, body: e.toString(), json: null };
  }
}

/**
 * Finds a verdict for a specific submission in judgements data.
 * @param {Array} judgements - The array of judgements from DomJudge.
 * @param {string} submissionId - The submission ID to find.
 * @returns {string} The verdict if found, or an empty string.
 */
function findVerdictForSubmission(judgements, submissionId) {
  for (let i = 0; i < judgements.length; i++) {
    if (judgements[i].submission_id === submissionId) {
      const verdict = judgements[i].judgement_type_id;
      logEvent("Found verdict for submission " + submissionId + ": " + verdict, getConfig().logLevelDebug);
      return verdict;
    }
  }
  logEvent("No judgement found yet for submission " + submissionId, getConfig().logLevelDebug);
  return "";
}

/**
 * Polls the DomJudge system for a verdict on a submission.
 * @param {string} submissionId - The ID of the submission to check.
 * @returns {string} The verdict if available, or an empty string if still pending.
 */
function pollJudgement(submissionId) {
  // Get configuration values
  const cid = getConfig().domjudgeContestId;
  const domjudgeUrl = getConfig().domjudgeApiUrl;
  const domjudgeUser = getConfig().domjudgeUser;
  const domjudgePass = getConfig().domjudgePass;
  
  try {
    // Create URL and auth header
    const url = createDomjudgeJudgementsUrl(domjudgeUrl, cid);
    const authHeader = createDomjudgeAuthHeader(domjudgeUser, domjudgePass);
    
    // Create headers and fetch options
    const headers = { "Authorization": authHeader };
    const options = createDomjudgeGetOptions(headers);
    
    // Make request to get judgements
    const response = fetchDomjudgeData(url, options);
    
    if (response.success) {
      return findVerdictForSubmission(response.json, submissionId);
    } else {
      logEvent("DomJudge Error when polling judgements: " + response.code + " - " + response.body, getConfig().logLevelError);
      return "";
    }
  } catch (e) {
    logEvent("Exception while polling judgements: " + e.toString(), getConfig().logLevelError);
    return "";
  }
}
