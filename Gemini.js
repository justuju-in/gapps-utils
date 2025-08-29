/**
 * Utility functions for interacting with the Gemini API.
 */

/**
 * Gets the Gemini API key from script properties.
 * @returns {string|null} The API key or null if not set.
 */
function getGeminiApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty(getConfig().geminiApiKeyProperty);
  if (!apiKey) {
    logEvent("GEMINI_API_KEY is not set in script properties.", getConfig().logLevelError);
    console.log("GEMINI_API_KEY is not set in script properties.");
    return null;
  }
  return apiKey;
}

/**
 * Builds the Gemini API endpoint URL.
 * @param {string} apiKey - The Gemini API key.
 * @returns {string} The complete endpoint URL.
 */
function buildGeminiEndpoint(apiKey) {
  return getConfig().geminiEndpoint + getConfig().geminiModel + `:generateContent?key=${apiKey}`;
}

/**
 * Gets file information from Google Drive.
 * @param {string} fileId - The Google Drive file ID.
 * @returns {Object|null} File information object or null if error.
 */
function getDriveFileInfo(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    console.log("DriveApp.getFileById success for fileId=" + fileId);
    
    const blob = file.getBlob();
    const mimeType = blob.getContentType();
    const fileName = file.getName();
    const fileBytes = blob.getBytes();
    const fileSize = fileBytes.length;
    
    logEvent(`Gemini call: fileId=${fileId}, fileName=${fileName}, mimeType=${mimeType}, size=${fileSize}`, getConfig().logLevelDebug);
    console.log(`Gemini call: fileId=${fileId}, fileName=${fileName}, mimeType=${mimeType}, size=${fileSize}`);
    
    // Check for empty or corrupted file
    if (fileSize === 0) {
      logEvent(`Gemini call error: File is empty. fileId=${fileId}, fileName=${fileName}`, getConfig().logLevelError);
      console.log(`Gemini call error: File is empty. fileId=${fileId}, fileName=${fileName}`);
      return null;
    }
    
    return {
      file,
      blob,
      mimeType,
      fileName,
      fileBytes,
      fileSize
    };
  } catch (e) {
    logEvent("DriveApp.getFileById failed for fileId=" + fileId + ": " + e, getConfig().logLevelError);
    console.log("DriveApp.getFileById failed for fileId=" + fileId + ": " + e);
    return null;
  }
}

/**
 * Creates the Gemini API request payload.
 * @param {string} mimeType - The MIME type of the file.
 * @param {string} fileBase64 - The base64-encoded file content.
 * @param {string} promptText - The prompt text to send to Gemini.
 * @param {number} temperature - The temperature parameter for generation.
 * @returns {Object} The formatted request payload.
 */
function createGeminiPayload(mimeType, fileBase64, promptText, temperature) {
  return {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: fileBase64
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: temperature
    }
  };
}

/**
 * Creates the options object for the URL fetch request.
 * @param {Object} payload - The request payload.
 * @returns {Object} The URL fetch options.
 */
function createFetchOptions(payload) {
  return {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

/**
 * Makes the API request to Gemini.
 * @param {string} endpoint - The API endpoint URL.
 * @param {Object} options - The fetch options.
 * @returns {Object} Object containing response code, body, and parsed JSON.
 */
function makeGeminiRequest(endpoint, options) {
  try {
    const resp = UrlFetchApp.fetch(endpoint, options);
    const code = resp.getResponseCode();
    const body = resp.getContentText();
    
    logEvent(`Gemini API response code: ${code}, body: ${body}`, getConfig().logLevelDebug);
    console.log(`Gemini API response code: ${code}, body: ${body}`);
    
    if (code !== 200) {
      logEvent(`Gemini API error (${code}): ${body}`, getConfig().logLevelError);
      console.log(`Gemini API error (${code}): ${body}`);
    }
    
    const json = JSON.parse(body);
    return { code, body, json };
  } catch (e) {
    logEvent("Gemini API fetch/parse error: " + e, getConfig().logLevelError);
    console.log("Gemini API fetch/parse error: " + e);
    return { code: 500, body: e.toString(), json: null };
  }
}

/**
 * Extracts and processes the Gemini API response.
 * @param {Object} json - The parsed JSON response.
 * @param {number} responseTime - The API response time in ms.
 * @returns {Object|null} Processed response with content and metadata.
 */
function processGeminiResponse(json, responseTime) {
  try {
    if (!json || !json.candidates || !json.candidates[0]) {
      logEvent("Gemini API response missing candidates", getConfig().logLevelError);
      return null;
    }
    
    const result = cleanCodeBlock(json.candidates[0].content.parts[0].text);
    console.log("Gemini API result: ", result);
    
    return {
      content: result,
      metadata: extractResponseMetadata(json, responseTime)
    };
  } catch (e) {
    logEvent("Gemini API response parse error: " + e, getConfig().logLevelError);
    console.log("Gemini API response parse error: " + e);
    return null;
  }
}

/**
 * Extracts metadata from Gemini API response.
 * @param {Object} json - The parsed JSON response.
 * @param {number} responseTime - The API response time in ms.
 * @returns {Object} The extracted metadata.
 */
function extractResponseMetadata(json, responseTime) {
  return {
    inputTokens: json.usageMetadata ? json.usageMetadata.promptTokenCount : 0,
    outputTokens: json.usageMetadata ? json.usageMetadata.candidatesTokenCount : 0,
    totalTokens: json.usageMetadata ? json.usageMetadata.totalTokenCount : 0,
    thoughtsTokenCount: json.usageMetadata ? json.usageMetadata.thoughtsTokenCount : 0,
    textTokenCount: json.usageMetadata && json.usageMetadata.promptTokensDetails ? 
      (json.usageMetadata.promptTokensDetails.find(detail => detail.modality === "TEXT")?.tokenCount || 0) : 0,
    imageTokenCount: json.usageMetadata && json.usageMetadata.promptTokensDetails ? 
      (json.usageMetadata.promptTokensDetails.find(detail => detail.modality === "IMAGE" || detail.modality === "DOCUMENT")?.tokenCount || 0) : 0,
    responseTime: responseTime,
    safetyRatings: JSON.stringify(json.candidates[0].safetyRatings || []),
    finishReason: json.candidates[0].finishReason || getConfig().defaultFinishReason,
    citationMetadata: JSON.stringify(json.candidates[0].citationMetadata || {}),
    modelVersion: json.modelVersion || getConfig().geminiModel,
    responseId: json.responseId || ""
  };
}

/**
 * Call the Gemini API with a Drive PDF/image file and prompt.
 * @param {string} fileId - The Google Drive file ID of the image/PDF to analyze.
 * @param {string} promptText - The prompt text to send to Gemini.
 * @param {number} temperature - The temperature parameter for generation (0-1).
 * @returns {Object|null} The Gemini response with content and metadata, or null if there was an error.
 */
function callGeminiWithDrivePDF(fileId, promptText, temperature = 0) {
  const startTime = Date.now();
  
  // Get API key
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  
  // Build endpoint URL
  const endpoint = buildGeminiEndpoint(apiKey);
  
  // Get file info from Drive
  const fileInfo = getDriveFileInfo(fileId);
  if (!fileInfo) return null;
  
  // Encode file to base64
  const fileBase64 = Utilities.base64Encode(fileInfo.fileBytes);
  
  // Create payload for API request
  const payload = createGeminiPayload(fileInfo.mimeType, fileBase64, promptText, temperature);
  
  // Create fetch options
  const options = createFetchOptions(payload);
  
  // Make the API request
  const response = makeGeminiRequest(endpoint, options);
  if (!response.json) return null;
  
  // Calculate response time
  const responseTime = Date.now() - startTime;
  
  // Process the response
  return processGeminiResponse(response.json, responseTime);
}