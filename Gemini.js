// Gemini.js - Functions for interacting with Gemini API
function callGeminiWithDrivePDF(fileId, promptText, temperature = 0) {
  const startTime = Date.now();
  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty(getConfig().geminiApiKeyProperty);
  if (!GEMINI_API_KEY) {
    logEvent("GEMINI_API_KEY is not set in script properties.", getConfig().logLevelError);
    console.log("GEMINI_API_KEY is not set in script properties.");
    return null;
  }
  const endpoint = getConfig().geminiEndpoint + getConfig().geminiModel + `:generateContent?key=${GEMINI_API_KEY}`;

  var file;
  try {
    file = DriveApp.getFileById(fileId);
    console.log("DriveApp.getFileById success for fileId=" + fileId);
  } catch (e) {
    logEvent("DriveApp.getFileById failed for fileId=" + fileId + ": " + e, getConfig().logLevelError);
    console.log("DriveApp.getFileById failed for fileId=" + fileId + ": " + e);
  }
  const blob = file.getBlob();
  const mimeType = blob.getContentType();
  const fileName = file.getName();
  const fileSize = blob.getBytes().length;
  logEvent(`Gemini call: fileId=${fileId}, fileName=${fileName}, mimeType=${mimeType}, size=${fileSize}`, getConfig().logLevelDebug);
  console.log(`Gemini call: fileId=${fileId}, fileName=${fileName}, mimeType=${mimeType}, size=${fileSize}`);

  // Check for empty or corrupted file
  if (fileSize === 0) {
    logEvent(`Gemini call error: File is empty. fileId=${fileId}, fileName=${fileName}`, getConfig().logLevelError);
    console.log(`Gemini call error: File is empty. fileId=${fileId}, fileName=${fileName}`);
    return null;
  }

  const fileBase64 = Utilities.base64Encode(blob.getBytes());

  const payload = {
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

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let resp, code, body, json;
  try {
    resp = UrlFetchApp.fetch(endpoint, options);
    code = resp.getResponseCode();
    body = resp.getContentText();
    logEvent(`Gemini API response code: ${code}, body: ${body}`, getConfig().logLevelDebug);
    console.log(`Gemini API response code: ${code}, body: ${body}`);
    json = JSON.parse(body);
  } catch (e) {
    logEvent("Gemini API fetch/parse error: " + e, getConfig().logLevelError);
    console.log("Gemini API fetch/parse error: " + e);
  }

  const responseTime = Date.now() - startTime;

  if (code !== 200) {
    logEvent(`Gemini API error (${code}): ${body}`, getConfig().logLevelError);
    console.log(`Gemini API error (${code}): ${body}`);
  }

  try {
    var result = cleanCodeBlock(json.candidates[0].content.parts[0].text);
    console.log("Gemini API result: ", result);
    
    // Return enhanced response with metadata
    return {
      content: result,
      metadata: {
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
      }
    };
  } catch (e) {
    logEvent("Gemini API response parse error: " + e, getConfig().logLevelError);
    console.log("Gemini API response parse error: " + e);
    return null;
  }
}