// Test function to start Gemini batch upload and batch creation
function testGeminiBatchUploadAndCreate(apiKey, driveFileId, model) {
  try {
    console.log("testGeminiBatchUploadAndCreate: apiKey", apiKey);
    console.log("testGeminiBatchUploadAndCreate: driveFileId", driveFileId);
    console.log("testGeminiBatchUploadAndCreate: model", model);
    var driveFile = DriveApp.getFileById(driveFileId);
    var uploadedFileName = uploadJsonlToGemini_(driveFile, apiKey);
    console.log("testGeminiBatchUploadAndCreate: uploadedFileName", uploadedFileName);
    var batch = createBatchWithFile_(getConfig().geminiEndpoint, apiKey, model, uploadedFileName, "flowchart-judge-test");
    console.log("testGeminiBatchUploadAndCreate: batch", batch);
    return batch;
  } catch (e) {
    console.log("testGeminiBatchUploadAndCreate: error", e);
    throw e;
  }
}
// Save code to Drive and return file URL
function saveCodeToDrive(timestamp, email, problemId, code) {
  var safeTimestamp = String(timestamp).replace(/[\s:/]/g, "-");
  var safeEmail = email.replace(/[@.]/g, "_");
  var filename = `${safeTimestamp}_${safeEmail}_${problemId}${
    getConfig().generatedCodeFileExtension
  }`;
  var folderName = getConfig().generatedCodesFolder;
  try {
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext()
      ? folders.next()
      : DriveApp.createFolder(folderName);
    var file = folder.createFile(filename, code, MimeType.PLAIN_TEXT);
    logEvent(
      `saveCodeToDrive: File saved. filename=${filename}, url=${file.getUrl()}`,
      getConfig().logLevelDebug
    );
    return file.getUrl();
  } catch (e) {
    logEvent(`saveCodeToDrive error: ${e}`, getConfig().logLevelError);
    throw e;
  }
}

// Read code from Drive file URL
function getCodeFromDriveUrl(fileUrl) {
  var fileIdMatch = fileUrl.match(/[-\w]{25,}/);
  if (!fileIdMatch) {
    logEvent(
      "getCodeFromDriveUrl: Invalid file URL: " + fileUrl,
      getConfig().logLevelError
    );
    return null;
  }
  try {
    var file = DriveApp.getFileById(fileIdMatch[0]);
    var code = file.getBlob().getDataAsString();
    logEvent(
      "getCodeFromDriveUrl: Read code from fileId=" + fileIdMatch[0],
      getConfig().logLevelDebug
    );
    return code;
  } catch (e) {
    logEvent("getCodeFromDriveUrl error: " + e, getConfig().logLevelError);
    throw e;
  }
}
// Helper functions for spreadsheet and URL handling
function getColumnIndexByName(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = headers.indexOf(name) + 1;
  if (idx === 0) {
    logEvent(
      "getColumnIndexByName: Column not found: " + name,
      getConfig().logLevelError
    );
    throw new Error('Column "' + name + '" not found in sheet');
  }
  return idx;
}

function getFileIdFromUrl(url) {
  var regex = /[-\w]{25,}/;
  var matches = url.match(regex);
  if (matches) {
    logEvent(
      "getFileIdFromUrl: Extracted fileId=" + matches[0],
      getConfig().logLevelDebug
    );
    return matches[0];
  } else {
    logEvent(
      "getFileIdFromUrl: No fileId found in url: " + url,
      getConfig().logLevelError
    );
    return null;
  }
}

function getProblemIdFromMeta(problemCode) {
  var metaSheetName = getConfig().metaSheet;
  var metaSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(metaSheetName);
  if (!metaSheet) {
    logEvent(
      "getProblemIdFromMeta: Meta sheet not found",
      getConfig().logLevelError
    );
    return null;
  }
  var data = metaSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    // skip header
    if (data[i][0] === problemCode) {
      logEvent(
        "getProblemIdFromMeta: Found problemId=" +
          data[i][1] +
          " for problemCode=" +
          problemCode,
        getConfig().logLevelDebug
      );
      return data[i][1]; // Column B: Problem id
    }
  }
  logEvent(
    "getProblemIdFromMeta: Problem code " +
      problemCode +
      " not found in Meta sheet",
    getConfig().logLevelError
  );
  return null;
}

function cleanCodeBlock(text) {
  // This regex matches code between triple backticks, optionally with a language tag like "python"
  var regex = /```(?:\w+)?\n([\s\S]*?)```/g;

  // Replace the entire match with just the captured group (the code inside)
  var cleaned = text.replace(regex, "$1");

  Logger.log(cleaned);
  return cleaned;
}

function getImageMimeType(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const mimeType = blob.getContentType();
    return mimeType;
  } catch (error) {
    Logger.log(
      `Error fetching MIME type for fileId ${fileId}: ${error.message}`
    );
    return null;
  }
}

// Gemini batch pipeline helpers
function getOrCreateFolder_(name) {
  const iter = DriveApp.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(name);
}

function uploadJsonlToGemini_(driveFile, apiKey) {
  const baseUrl = getConfig().geminiEndpoint;
  const bytes = driveFile.getBlob().getBytes();
  const mime = "application/jsonl";
  const displayName = "BatchInput-" + driveFile.getName();

  // Debug: log upload parameters
  console.log("uploadJsonlToGemini_: baseUrl", baseUrl);
  console.log("uploadJsonlToGemini_: displayName", displayName);
  console.log("uploadJsonlToGemini_: bytes.length", bytes.length);

  // start
  const startResp = UrlFetchApp.fetch(`${baseUrl}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ file: { display_name: displayName } }),
    muteHttpExceptions: true,
    headers: {
  "X-Goog-Upload-Protocol": "resumable",
  "X-Goog-Upload-Command": "start",
  // DO NOT set X-Goog-Upload-Header-Content-Length, Apps Script manages it automatically
  "X-Goog-Upload-Header-Content-Type": mime
    }
  });
  console.log("uploadJsonlToGemini_: startResp code", startResp.getResponseCode());
  console.log("uploadJsonlToGemini_: startResp headers", startResp.getHeaders());
  if (startResp.getResponseCode() < 200 || startResp.getResponseCode() >= 300)
    throw new Error("Resumable start failed: " + startResp.getContentText());

  const uploadUrl = startResp.getHeaders()["X-Goog-Upload-Url"] || startResp.getHeaders()["x-goog-upload-url"];
  console.log("uploadJsonlToGemini_: uploadUrl", uploadUrl);
  if (!uploadUrl) throw new Error("Missing X-Goog-Upload-Url");

  // upload + finalize
  const upResp = UrlFetchApp.fetch(uploadUrl, {
    method: "post",
    contentType: mime,
    payload: bytes,
    muteHttpExceptions: true,
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0"
      // DO NOT set Content-Length, Apps Script manages it automatically
    }
  });
  console.log("uploadJsonlToGemini_: upResp code", upResp.getResponseCode());
  console.log("uploadJsonlToGemini_: upResp text", upResp.getContentText());
  if (upResp.getResponseCode() < 200 || upResp.getResponseCode() >= 300)
    throw new Error("Upload failed: " + upResp.getContentText());

  const json = JSON.parse(upResp.getContentText());
  console.log("uploadJsonlToGemini_: upload response json", json);
  const fileName = json?.file?.name;
  if (!fileName) throw new Error("Upload response missing file.name");
  return fileName; // e.g., "files/abc123"
}

function createBatchWithFile_(baseUrl, apiKey, model, fileName, displayName) {
  // The Gemini batch endpoint requires the API key as a query parameter, not as a header
  // Use /models/{model}:batchGenerateContent for Gemini batch API
  const url = `${baseUrl}/v1beta/models/${model}:batchGenerateContent?key=${encodeURIComponent(apiKey)}`;
  const body = { batch: { displayName, inputConfig: { fileName } } };
  console.log("createBatchWithFile_: url", url);
  console.log("createBatchWithFile_: body", body);
  const resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true
    // No need for x-goog-api-key header
  });
  console.log("createBatchWithFile_: resp code", resp.getResponseCode());
  console.log("createBatchWithFile_: resp text", resp.getContentText());
  if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300)
    throw new Error("Batch create failed: " + resp.getContentText());
  return JSON.parse(resp.getContentText());
}

function getBatch_(baseUrl, apiKey, batchName) {
  const url = `${baseUrl}/v1beta/${batchName}`;
  console.log("getBatch_: url", url);
  const resp = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }
  });
  console.log("getBatch_: resp code", resp.getResponseCode());
  console.log("getBatch_: resp text", resp.getContentText());
  if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300)
    throw new Error("getBatch failed: " + resp.getContentText());
  return JSON.parse(resp.getContentText());
}

function isTerminalState_(state) {
  return new Set([
    "BATCH_STATE_SUCCEEDED","BATCH_STATE_FAILED","BATCH_STATE_CANCELLED","BATCH_STATE_EXPIRED",
    "JOB_STATE_SUCCEEDED","JOB_STATE_FAILED","JOB_STATE_CANCELLED","JOB_STATE_EXPIRED"
  ]).has(state);
}

function downloadResponsesFile_(baseUrl, apiKey, responsesFile) {
  const url = `${baseUrl}/download/v1beta/${responsesFile}:download?alt=media`;
  console.log("downloadResponsesFile_: url", url);
  const resp = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    headers: { "x-goog-api-key": apiKey }
  });
  console.log("downloadResponsesFile_: resp code", resp.getResponseCode());
  if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300)
    throw new Error("downloadResponsesFile failed: " + resp.getContentText());
  return resp.getBlob().getBytes();
}