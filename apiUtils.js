/**
 * apiUtils.js - Centralized API utility functions
 * 
 * This file contains generic API utility functions that can be used
 * across the application for any API interactions, not just DOMjudge.
 * All external API calls should use these utilities for consistency.
 */

/**
 * Makes a generic API call with standardized response handling.
 * This function can be used for any API, not just DOMjudge.
 * 
 * @param {string} url - The API endpoint URL
 * @param {Object} options - The request options
 * @param {string} [serviceName="API"] - Name of the service for logging
 * @returns {Object} Standardized response object with success, code, body, and json properties
 */
function makeApiCall(url, options, serviceName = "API") {
  try {
    // Log the request for debugging
    logEvent(`Making ${serviceName} request to: ${url}`, getConfig().logLevelDebug);
    console.log(`Making ${serviceName} request to: ${url}`);
    
    // Make the actual request
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    const isSuccess = (responseCode >= 200 && responseCode < 300);
    
    // Log the response for debugging
    logEvent(`${serviceName} response code: ${responseCode}`, getConfig().logLevelDebug);
    
    // Only parse JSON if we have a successful response with content
    let parsedJson = null;
    if (isSuccess && responseBody) {
      try {
        parsedJson = JSON.parse(responseBody);
      } catch (jsonError) {
        // Response is not JSON or is invalid JSON
        logEvent(`${serviceName} response is not valid JSON: ${jsonError}`, getConfig().logLevelDebug);
      }
    }
    
    // Return standardized response object
    return {
      success: isSuccess,
      code: responseCode,
      body: responseBody,
      json: parsedJson
    };
  } catch (e) {
    // Log any exceptions during the API call
    logEvent(`${serviceName} request error: ${e.toString()}`, getConfig().logLevelError);
    console.error(`${serviceName} request error:`, e);
    
    // Return a standardized error response
    return { 
      success: false, 
      code: 500, 
      body: e.toString(), 
      json: null,
      error: e
    };
  }
}

/**
 * Makes a DOMjudge API request using the generic API call function.
 * This is a specialized wrapper around makeApiCall for DOMjudge.
 * 
 * @param {string} url - The DOMjudge API URL
 * @param {Object} options - The request options
 * @returns {Object} Standardized response from makeApiCall
 */
function makeDomjudgeRequest(url, options) {
  return makeApiCall(url, options, "DOMjudge");
}

/**
 * Makes a Gemini API request using the generic API call function.
 * This is a specialized wrapper around makeApiCall for Gemini.
 * 
 * @param {string} url - The Gemini API URL
 * @param {Object} options - The request options
 * @returns {Object} Standardized response from makeApiCall
 */
function makeGeminiRequest(url, options) {
  return makeApiCall(url, options, "Gemini");
}

/**
 * Creates standard authorization headers for basic auth.
 * 
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {Object} Headers object with Authorization
 */
function createBasicAuthHeaders(username, password) {
  return {
    "Authorization": "Basic " + Utilities.base64Encode(username + ":" + password),
    "Content-Type": "application/json"
  };
}

/**
 * Creates standard authorization headers for API key auth.
 * 
 * @param {string} apiKey - The API key
 * @param {string} [headerName="Authorization"] - The header name for the API key
 * @param {string} [prefix="Bearer"] - The prefix to use before the API key
 * @returns {Object} Headers object with API key authorization
 */
function createApiKeyHeaders(apiKey, headerName = "Authorization", prefix = "Bearer") {
  const headers = {
    "Content-Type": "application/json"
  };
  
  headers[headerName] = `${prefix} ${apiKey}`;
  return headers;
}

/**
 * Creates standard options for a GET request.
 * 
 * @param {Object} headers - The request headers
 * @returns {Object} Options for UrlFetchApp.fetch
 */
function createGetRequestOptions(headers) {
  return {
    method: "get",
    headers: headers,
    muteHttpExceptions: true
  };
}

/**
 * Creates standard options for a POST request with JSON payload.
 * 
 * @param {Object} headers - The request headers
 * @param {Object|string} payload - The request payload (will be stringified if object)
 * @returns {Object} Options for UrlFetchApp.fetch
 */
function createPostRequestOptions(headers, payload) {
  return {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: typeof payload === 'object' ? JSON.stringify(payload) : payload,
    muteHttpExceptions: true
  };
}
