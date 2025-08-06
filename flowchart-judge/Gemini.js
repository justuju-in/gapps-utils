/**
 * Helper function to process a small batch of requests
 * @param {Array} batchRequests - Array of request objects to process
 * @param {string} endpoint - The API endpoint
 * @param {Array} mapping - Index mapping for responses
 * @returns {Array} Array of responses
 */
function processSmallBatch(batchRequests, endpoint, mapping) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty(getConfig().geminiApiKeyProperty);
  if (!GEMINI_API_KEY) {
    logEvent("GEMINI_API_KEY is not set in script properties.", getConfig().logLevelError);
    return null;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Format requests according to batch API spec
      var requests = batchRequests.map((req, index) => ({
        request: {
          contents: [{
            parts: req.contents[0].parts
          }],
          generationConfig: req.generationConfig
        },
        metadata: { key: `request-${index + 1}` }
      }));
      
      var payload = {
        batch: {
          displayName: 'flowchart-inline-batch',
          inputConfig: {
            requests: {
              requests: requests
            }
          }
        }
      };
      
      var options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var resp = UrlFetchApp.fetch(endpoint, options);
      var code = resp.getResponseCode();
      var body = resp.getContentText();
      
      if (code === 200) {
        var json = JSON.parse(body);
        // Check for operation name in response
        if (json && json.name) {
          // Poll operation until complete
          for (let pollAttempt = 0; pollAttempt < 5; pollAttempt++) {
            var pollResp = UrlFetchApp.fetch(
              `https://generativelanguage.googleapis.com/v1beta/${json.name}?key=${GEMINI_API_KEY}`,
              { muteHttpExceptions: true }
            );
            var pollJson = JSON.parse(pollResp.getContentText());
            
            if (pollJson.done) {
              if (pollJson.error) {
                logEvent(`Batch operation failed: ${JSON.stringify(pollJson.error)}`, getConfig().logLevelError);
                break;
              }
              if (pollJson.response && pollJson.response.batch && pollJson.response.batch.inlinedResponses) {
                return pollJson.response.batch.inlinedResponses.map(resp => resp.response.candidates[0]);
              }
              break;
            }
            
            Utilities.sleep(2000 * (pollAttempt + 1));
          }
          logEvent(`Batch operation not completed after polling: ${json.name}`, getConfig().logLevelError);
        } else {
          logEvent(`Unexpected response structure: ${JSON.stringify(json)}`, getConfig().logLevelError);
        }
      }
      
      logEvent(`Attempt ${attempt + 1} failed: ${code} - ${body}`, getConfig().logLevelError);
      if (attempt < MAX_RETRIES - 1) {
        Utilities.sleep(RETRY_DELAY * (attempt + 1));
      }
    } catch (e) {
      logEvent(`Batch attempt ${attempt + 1} error: ${e}`, getConfig().logLevelError);
      if (attempt < MAX_RETRIES - 1) {
        Utilities.sleep(RETRY_DELAY * (attempt + 1));
      }
    }
  }
  return null;
}

/**
 * Batch mode: Send multiple requests to Gemini API using batch endpoint.
 * @param {Array} requests - Array of {fileId, promptText, temperature}
 * @returns {Array} Array of responses (same order as requests)
 */
function callGeminiBatch(requests) {
  var GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty(getConfig().geminiApiKeyProperty);
  if (!GEMINI_API_KEY) {
    logEvent("GEMINI_API_KEY is not set in script properties.", getConfig().logLevelError);
    return null;
  }
  
  // Log batch details
  logEvent(`Starting batch process for ${requests.length} requests`, getConfig().logLevelInfo);
  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + getConfig().geminiModel + ':batchGenerateContent?key=' + GEMINI_API_KEY;
  logEvent(`Using endpoint: ${endpoint.replace(GEMINI_API_KEY, 'REDACTED')}`, getConfig().logLevelDebug);

  // Maximum size for a single batch (to prevent URLFetch size limits)
  const MAX_BATCH_SIZE = 5; // Start small, can be increased if working well


  // Threshold for large batch (file-based) mode
  var LARGE_BATCH_THRESHOLD = 50;
  if (requests.length > LARGE_BATCH_THRESHOLD) {
    // Large batch: create JSONL, upload, and submit batch job
    try {
      var jsonlLines = [];
      for (var i = 0; i < requests.length; i++) {
        var req = requests[i];
        var file = DriveApp.getFileById(req.fileId);
        var blob = file.getBlob();
        var mimeType = blob.getContentType();
        var fileBase64 = Utilities.base64Encode(blob.getBytes());
        var requestObj = {
          request: {
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: fileBase64
                  }
                },
                {
                  text: req.promptText
                }
              ]
            }],
            generationConfig: {
              temperature: req.temperature || 0
            }
          },
          metadata: { key: `request-${i + 1}` }
        };
        jsonlLines.push(JSON.stringify(requestObj));
      }
      var jsonlContent = jsonlLines.join('\n');
      // Upload JSONL file to Gemini File API
      var uploadUrlResp = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/upload/v1beta/files',
        {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'x-goog-api-key': GEMINI_API_KEY,
            'X-Goog-Upload-Protocol': 'raw',
            'Content-Type': 'application/jsonl'
          },
          payload: jsonlContent,
          muteHttpExceptions: true
        }
      );
      var uploadRespJson = JSON.parse(uploadUrlResp.getContentText());
      var fileName = uploadRespJson.file && uploadRespJson.file.name;
      if (!fileName) {
        logEvent('Gemini File API upload failed: ' + uploadUrlResp.getContentText(), getConfig().logLevelError);
        return requests.map(_ => null);
      }
      // Submit batch job
      var batchPayload = {
        batch: {
          display_name: 'flowchart-batch-job',
          input_config: {
            requests: {
              file_name: fileName
            }
          }
        }
      };
      var batchResp = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(batchPayload),
        muteHttpExceptions: true
      });
      var batchRespJson = JSON.parse(batchResp.getContentText());
      logEvent('Gemini large batch job submitted: ' + batchResp.getContentText(), getConfig().logLevelInfo);
      // Return job name for tracking (user must poll for results)
      return batchRespJson && batchRespJson.name ? batchRespJson : null;
    } catch (e) {
      logEvent('Gemini large batch error: ' + e, getConfig().logLevelError);
      return requests.map(_ => null);
    }
  } else {
    // Process in small batches to avoid URLFetch limits
    var allResults = requests.map(_ => null);
    var batchRequests = [];
    var mapping = [];
    
    // First prepare all requests
    for (var i = 0; i < requests.length; i++) {
      var req = requests[i];
      try {
        var file = DriveApp.getFileById(req.fileId);
        var blob = file.getBlob();
        var mimeType = blob.getContentType();
        var fileBase64 = Utilities.base64Encode(blob.getBytes());
        batchRequests.push({
          model: getConfig().geminiModel,
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
                  text: req.promptText
                }
              ]
            }
          ],
          generationConfig: {
            temperature: req.temperature || 0
          }
        });
        mapping.push(i);
      } catch (e) {
        logEvent("Batch: Error preparing request for fileId=" + req.fileId + ": " + e, getConfig().logLevelError);
        batchRequests.push(null);
      }
    }
    // Remove nulls
    var validRequests = [];
    var validMapping = [];
    for (var j = 0; j < batchRequests.length; j++) {
      if (batchRequests[j]) {
        validRequests.push(batchRequests[j]);
        validMapping.push(mapping[j]);
      }
    }
    if (validRequests.length === 0) {
      logEvent("Batch: No valid requests to send.", getConfig().logLevelError);
      return requests.map(_ => null);
    }

    // Process in smaller batches
    for (var j = 0; j < validRequests.length; j += MAX_BATCH_SIZE) {
      var batchSlice = validRequests.slice(j, j + MAX_BATCH_SIZE);
      var mappingSlice = validMapping.slice(j, j + MAX_BATCH_SIZE);
      
      logEvent(`Processing batch ${Math.floor(j/MAX_BATCH_SIZE) + 1} of ${Math.ceil(validRequests.length/MAX_BATCH_SIZE)}`, getConfig().logLevelInfo);
      
      var batchResponses = processSmallBatch(batchSlice, endpoint, mappingSlice);
      
      if (batchResponses) {
        for (var k = 0; k < batchResponses.length; k++) {
          try {
            var response = batchResponses[k];
            if (response && response.content && response.content.parts && 
                response.content.parts[0] && response.content.parts[0].text) {
              allResults[mappingSlice[k]] = cleanCodeBlock(response.content.parts[0].text);
            }
          } catch (e) {
            logEvent(`Error parsing response ${k} in batch ${Math.floor(j/MAX_BATCH_SIZE) + 1}: ${e}`, getConfig().logLevelError);
          }
        }
      }
      
      // Add a small delay between batches to avoid rate limits
      if (j + MAX_BATCH_SIZE < validRequests.length) {
        Utilities.sleep(500);
      }
    }

    return allResults;
  }
}

/**
 * Unified Gemini processing: chooses in-line or batch mode based on request count.
 * @param {Array|Object} requests - Array of {fileId, promptText, temperature} or single request object
 * @returns {Array|string|null} Array of responses or single response/null
 */
function processGeminiRequests(requests) {
  if (!Array.isArray(requests)) {
    // Single request, use in-line
    var r = requests;
    return callGeminiWithDrivePDF(r.fileId, r.promptText, r.temperature);
  }
  if (requests.length === 1) {
    // Single request, use in-line
    var r = requests[0];
    return [callGeminiWithDrivePDF(r.fileId, r.promptText, r.temperature)];
  } else {
    // Any batch (2 or more), use batch endpoint
    return callGeminiBatch(requests);
  }
}
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
          (json.usageMetadata.promptTokensDetails.find(detail => detail.modality === "IMAGE")?.tokenCount || 0) : 0,
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