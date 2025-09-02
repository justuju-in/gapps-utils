/**
 * Core functions for making requests to the Gemini API.
 * These functions use the centralized API utilities from apiUtils.js.
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
 * @param {string} [model] - The Gemini model to use (defaults to config)
 * @returns {string} The complete endpoint URL without API key
 */
function buildGeminiEndpointUrl(model) {
  const modelName = model || getConfig().geminiModel;
  return `${getConfig().geminiEndpoint}${modelName}:generateContent`;
}

/**
 * Creates authorization headers for Gemini API.
 * 
 * @returns {Object} Headers with API key
 */
function createGeminiAuthHeaders() {
  // For Gemini, the API key is passed as a query parameter, not a header
  return { "Content-Type": "application/json" };
}

/**
 * Formats an error message from a Gemini API response for logging
 * @param {Object} response - The failed response object
 * @return {string} - Formatted error message
 */
function formatGeminiErrorMessage(response) {
  if (!response) {
    return "No response received";
  }
  
  if (response.body) {
    try {
      const errorBody = JSON.parse(response.body);
      if (errorBody.error) {
        return `${errorBody.error.code || "Error"}: ${errorBody.error.message || "Unknown error"}`;
      }
    } catch (e) {
      // If parsing fails, just return the body
    }
    return response.body;
  }
  
  return `Status: ${response.status || "Unknown"}, Message: ${response.statusText || "No details available"}`;
}

/**
 * Makes the API request to Gemini using the centralized API utilities.
 * @param {string} endpoint - The API endpoint URL.
 * @param {Object} options - The fetch options.
 * @returns {Object} Standardized response from makeApiCall
 */
function makeGeminiRequest(endpoint, options) {
  // Append API key as query parameter if not already present
  const apiKey = getGeminiApiKey();
  const urlWithKey = endpoint.includes('?') ? 
    `${endpoint}&key=${apiKey}` : 
    `${endpoint}?key=${apiKey}`;
    
  // Use the centralized makeApiCall function with "Gemini" as the service name
  return makeApiCall(urlWithKey, options, "Gemini");
}

/**
 * Creates payload for a Gemini API request with image input.
 * 
 * @param {string} mimeType - MIME type of the image
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} promptText - Text prompt to send with the image
 * @param {number} temperature - Generation temperature (0-1)
 * @returns {Object} Formatted Gemini API payload
 */
function createGeminiImagePayload(mimeType, imageBase64, promptText, temperature) {
  return {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
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
 * Creates payload for a Gemini API request with text input only.
 * 
 * @param {string} promptText - Text prompt to send
 * @param {number} temperature - Generation temperature (0-1)
 * @returns {Object} Formatted Gemini API payload
 */
function createGeminiTextPayload(promptText, temperature) {
  return {
    contents: [
      {
        parts: [
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
 * Makes a complete Gemini request with image input.
 * 
 * @param {string} fileId - Google Drive file ID for the image
 * @param {string} promptText - Text prompt to send with the image
 * @param {number} temperature - Generation temperature (0-1)
 * @returns {Object|null} Processed Gemini response or null if error
 */
function processGeminiImageRequest(fileId, promptText, temperature) {
  // Get file info from Drive
  const fileInfo = getDriveFileInfo(fileId);
  if (!fileInfo) {
    logEvent("Failed to get file info for fileId: " + fileId, getConfig().logLevelError);
    return null;
  }
  
  // Encode file to base64
  const fileBase64 = Utilities.base64Encode(fileInfo.fileBytes);
  
  // Make the request using base function
  return makeGeminiContentRequest(
    createGeminiImagePayload(fileInfo.mimeType, fileBase64, promptText, temperature)
  );
}

/**
 * Makes a complete Gemini request with text input only.
 * 
 * @param {string} promptText - Text prompt to send
 * @param {number} temperature - Generation temperature (0-1)
 * @returns {Object|null} Processed Gemini response or null if error
 */
function processGeminiTextRequest(promptText, temperature) {
  return makeGeminiContentRequest(
    createGeminiTextPayload(promptText, temperature)
  );
}

/**
 * Core function to make a Gemini content generation request.
 * 
 * @param {Object} payload - The request payload
 * @returns {Object|null} Processed Gemini response or null if error
 */
function makeGeminiContentRequest(payload) {
  // Build endpoint URL (without API key, it will be added by makeGeminiRequest)
  const endpoint = buildGeminiEndpointUrl();
  
  // Create request options
  const options = createPostRequestOptions(createGeminiAuthHeaders(), payload);
  
  // Calculate start time for response time tracking
  const startTime = Date.now();
  
  // Make the API request using centralized utility
  const response = makeGeminiRequest(endpoint, options);
  
  // Calculate response time
  const responseTime = Date.now() - startTime;
  
  if (!response || !response.success) {
    const errorMessage = formatGeminiErrorMessage(response);
    logEvent("Failed to get valid response from Gemini API: " + errorMessage, getConfig().logLevelError);
    return null;
  }
  
  // Process the response
  return processGeminiResponse(response.json, responseTime);
}

/**
 * Extracts and processes the Gemini API response.
 * 
 * @param {Object} json - The parsed JSON response
 * @param {number} responseTime - The API response time in ms
 * @returns {Object|null} Processed response with content and metadata
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
 * 
 * @param {Object} json - The parsed JSON response
 * @param {number} responseTime - The API response time in ms
 * @returns {Object} The extracted metadata
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