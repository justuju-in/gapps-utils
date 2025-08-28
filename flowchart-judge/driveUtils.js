/**
 * Utility functions for interacting with Google Drive.
 */

/**
 * Sanitizes a timestamp for use in filenames.
 * @param {string|Date} timestamp - The timestamp to sanitize.
 * @returns {string} - Sanitized timestamp string.
 */
function sanitizeTimestamp(timestamp) {
  return String(timestamp).replace(/[\s:/]/g, "-");
}

/**
 * Sanitizes an email address for use in filenames.
 * @param {string} email - The email to sanitize.
 * @returns {string} - Sanitized email string.
 */
function sanitizeEmail(email) {
  return email.replace(/[@.]/g, "_");
}

/**
 * Generates a filename for a code file.
 * @param {string|Date} timestamp - The timestamp to include.
 * @param {string} email - The email address to include.
 * @param {string} problemId - The problem ID to include.
 * @returns {string} - The generated filename.
 */
function generateCodeFilename(timestamp, email, problemId) {
  var safeTimestamp = sanitizeTimestamp(timestamp);
  var safeEmail = sanitizeEmail(email);
  return `${safeTimestamp}_${safeEmail}_${problemId}${
    getConfig().generatedCodeFileExtension
  }`;
}

/**
 * Gets or creates a folder in Google Drive.
 * @param {string} folderName - The name of the folder.
 * @returns {Folder} - The Google Drive folder.
 */
function getOrCreateDriveFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

/**
 * Saves code to Google Drive and returns the file URL.
 * @param {string|Date} timestamp - The timestamp to include in the filename.
 * @param {string} email - The email address to include in the filename.
 * @param {string} problemId - The problem ID to include in the filename.
 * @param {string} code - The code content to save.
 * @returns {string} The URL of the saved file.
 */
function saveCodeToDrive(timestamp, email, problemId, code) {
  var filename = generateCodeFilename(timestamp, email, problemId);
  var folderName = getConfig().generatedCodesFolder;
  
  try {
    var folder = getOrCreateDriveFolder(folderName);
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

/**
 * Gets a file from Drive by its ID.
 * @param {string} fileId - The ID of the file to retrieve.
 * @returns {GoogleAppsScript.Drive.File|null} The Drive file or null if not found.
 */
function getDriveFileById(fileId) {
  try {
    return DriveApp.getFileById(fileId);
  } catch (e) {
    logEvent(`getDriveFileById error: ${e}`, getConfig().logLevelError);
    return null;
  }
}

/**
 * Gets file content as string from a Drive file.
 * @param {GoogleAppsScript.Drive.File} file - The Drive file.
 * @returns {string} The file content as string.
 */
function getFileContentAsString(file) {
  return file.getBlob().getDataAsString();
}

/**
 * Extracts code from a Google Drive file URL.
 * @param {string} fileUrl - The URL of the file to read.
 * @returns {string|null} The code content of the file or null if not found.
 */
function getCodeFromDriveUrl(fileUrl) {
  var fileId = getFileIdFromUrl(fileUrl);
  if (!fileId) {
    logEvent(
      "getCodeFromDriveUrl: Invalid file URL: " + fileUrl,
      getConfig().logLevelError
    );
    return null;
  }
  
  try {
    var file = getDriveFileById(fileId);
    if (!file) return null;
    
    var code = getFileContentAsString(file);
    logEvent(
      "getCodeFromDriveUrl: Read code from fileId=" + fileId,
      getConfig().logLevelDebug
    );
    return code;
  } catch (e) {
    logEvent("getCodeFromDriveUrl error: " + e, getConfig().logLevelError);
    throw e;
  }
}

/**
 * Extracts the file ID from a Google Drive URL.
 * @param {string} url - The URL to extract the file ID from.
 * @returns {string|null} The extracted file ID or null if not found.
 */
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

/**
 * Gets a blob from a Drive file.
 * @param {GoogleAppsScript.Drive.File} file - The Drive file.
 * @returns {GoogleAppsScript.Base.Blob} The blob representing the file.
 */
function getFileBlob(file) {
  return file.getBlob();
}

/**
 * Gets the MIME type from a blob.
 * @param {GoogleAppsScript.Base.Blob} blob - The blob to check.
 * @returns {string} The MIME type.
 */
function getBlobMimeType(blob) {
  return blob.getContentType();
}

/**
 * Gets the MIME type of a file in Google Drive.
 * @param {string} fileId - The ID of the file to check.
 * @returns {string|null} The MIME type of the file or null if an error occurs.
 */
function getImageMimeType(fileId) {
  try {
    const file = getDriveFileById(fileId);
    if (!file) return null;
    
    const blob = getFileBlob(file);
    const mimeType = getBlobMimeType(blob);
    
    logEvent(
      `getImageMimeType: Fetched MIME type ${mimeType} for fileId=${fileId}`,
      getConfig().logLevelDebug
    );
    return mimeType;
  } catch (error) {
    logEvent(
      `getImageMimeType error: ${error.message}`,
      getConfig().logLevelError
    );
    return null;
  }
}
