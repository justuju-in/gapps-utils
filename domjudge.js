/**
 * domjudge.js - DOMjudge API specific utilities
 * 
 * This file contains specialized utilities for interacting with the DOMjudge API.
 * These functions build on the generic API utilities from apiUtils.js.
 */

/**
 * Creates a DOMjudge submission URL from contest ID.
 * 
 * @param {string} baseUrl - The base DOMjudge API URL
 * @param {string} contestId - The contest ID
 * @returns {string} The full submissions URL
 */
function createDomjudgeSubmissionUrl(baseUrl, contestId) {
  return `${baseUrl}/contests/${contestId}/submissions`;
}

/**
 * Creates a DOMjudge judgements URL with optional submission ID filter.
 * 
 * @param {string} baseUrl - The base DOMjudge API URL
 * @param {string} contestId - The contest ID
 * @param {string} [submissionId] - Optional submission ID to filter judgements
 * @returns {string} The full judgements URL
 */
function createDomjudgeJudgementsUrl(baseUrl, contestId, submissionId) {
  let url = `${baseUrl}/contests/${contestId}/judgements`;
  if (submissionId) {
    url += `?submission_id=${encodeURIComponent(submissionId)}&strict=false`;
  }
  return url;
}

/**
 * Creates authorization headers for DOMjudge API using student credentials.
 * 
 * @returns {Object} Headers with student authorization
 */
function createDomjudgeStudentAuthHeaders() {
  const username = getConfig().domjudgeUser;
  const password = getConfig().domjudgePass;
  return createBasicAuthHeaders(username, password);
}

/**
 * Creates authorization headers for DOMjudge API using admin credentials.
 * 
 * @returns {Object} Headers with admin authorization
 */
function createDomjudgeAdminAuthHeaders() {
  const username = getConfig().domjudgeAdminUser;
  const password = getConfig().domjudgeAdminPass;
  return createBasicAuthHeaders(username, password);
}

/**
 * Submits code to DOMjudge using the centralized API utility.
 * 
 * @param {string} code - The code to submit
 * @param {string|number} problemId - The problem ID
 * @returns {string} The submission ID if successful, empty string otherwise
 */
function submitToDomjudge(code, problemId) {
  // Get configuration values
  const contestId = getConfig().domjudgeContestId;
  const languageId = getConfig().domjudgeLanguageId;
  const filename = getConfig().domjudgeSolutionFilename;
  const teamId = getConfig().domjudgeTeamId;
  const domjudgeUrl = getConfig().domjudgeApiUrl;
  
  // Prepare file for submission
  const codeBlob = Utilities.newBlob(code, 'text/x-python', filename);
  const zipBlob = Utilities.zip([codeBlob], getConfig().domjudgeZipFilename);
  const encodedZip = Utilities.base64Encode(zipBlob.getBytes());
  
  // Create submission URL
  const url = createDomjudgeSubmissionUrl(domjudgeUrl, contestId);
  
  // Ensure problemId is properly formatted (numeric if possible)
  const parsedProblemId = !isNaN(problemId) ? Number(problemId) : String(problemId);
  
  // Create submission payload
  const payload = {
    problem_id: parsedProblemId,
    language_id: languageId,
    team_id: teamId,
    files: [
      {
        filename: getConfig().domjudgeZipFilename,
        data: encodedZip,
      },
    ],
  };
  
  // Create request headers and options
  const headers = createDomjudgeStudentAuthHeaders();
  const options = createPostRequestOptions(headers, payload);
  
  // Make the API call using the centralized utility
  const response = makeDomjudgeRequest(url, options);
  
  // Process the response
  if (response.success) {
    logEvent("Successfully submitted. Judge ID: " + response.json.id, getConfig().logLevelDebug);
    console.log("Submission successful: " + JSON.stringify(response.json));
    return response.json.id;
  } else {
    logEvent("DomJudge Error: " + response.code + " - " + response.body, getConfig().logLevelError);
    return "";
  }
}