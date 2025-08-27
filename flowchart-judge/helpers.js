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
