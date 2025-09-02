/**
 * Utility functions for handling Google Drive files.
 * Provides functions for working with files in Google Drive.
 */

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
 * Extracts file ID from a Google Drive URL.
 * @param {string} url - The Google Drive URL.
 * @returns {string|null} The file ID or null if invalid URL.
 */
function getFileIdFromUrl(url) {
  try {
    // Extract the file ID from various types of Drive URLs
    var fileIdRegex = /[-\w]{25,}/;
    var match = url.match(fileIdRegex);
    return match ? match[0] : null;
  } catch (e) {
    logEvent("getFileIdFromUrl error: " + e, getConfig().logLevelError);
    return null;
  }
}

/**
 * Gets the MIME type of an image file.
 * @param {string} fileId - The Google Drive file ID.
 * @returns {string} The MIME type of the file.
 */
function getImageMimeType(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    return file.getMimeType();
  } catch (e) {
    logEvent("getImageMimeType error: " + e, getConfig().logLevelError);
    return "unknown";
  }
}

/**
 * Saves code to a Drive file.
 * @param {string} timestamp - The timestamp for file naming.
 * @param {string} email - The submitter's email.
 * @param {string} problemId - The problem ID.
 * @param {string} code - The code content.
 * @returns {string} The URL to the created file.
 */
function saveCodeToDrive(timestamp, email, problemId, code) {
  try {
    // Format timestamp for filename
    var formattedTimestamp = timestamp instanceof Date ? 
      timestamp.toISOString().replace(/[^0-9]/g, '-') : 
      String(timestamp).replace(/[^0-9]/g, '-');
    // Sanitize email for filename
    var safeEmail = email.replace(/@/g, '-at-').replace(/\./g, '-');
    // Create filename with problem ID
    var filename = `${formattedTimestamp}_${safeEmail}_${problemId}${getConfig().generatedCodeFileExtension}`;
    
    // Get or create folder
    var folderName = getConfig().generatedCodesFolder;
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
      logEvent(`Found existing folder: ${folderName}`, getConfig().logLevelDebug);
    } else {
      folder = DriveApp.createFolder(folderName);
      logEvent(`Created new folder: ${folderName}`, getConfig().logLevelDebug);
    }
    
    // Create file and get URL
    var file = folder.createFile(filename, code);
    return file.getUrl();
  } catch (e) {
    logEvent(`saveCodeToDrive error: ${e}`, getConfig().logLevelError);
    return "";
  }
}

/**
 * Gets code content from a Drive file URL.
 * @param {string} url - The Drive file URL.
 * @returns {string|null} The code content or null if error.
 */
function getCodeFromDriveUrl(url) {
  if (!url) {
    logEvent("getCodeFromDriveUrl error: URL is empty or undefined", getConfig().logLevelError);
    return null;
  }

  try {
    // Ensure Drive API is ready
    if (!DriveApp) {
      logEvent("getCodeFromDriveUrl error: DriveApp not available", getConfig().logLevelError);
      return null;
    }

    // Extract file ID with improved error handling
    var fileId = getFileIdFromUrl(url);
    if (!fileId) {
      logEvent("Invalid Drive URL format: " + url, getConfig().logLevelError);
      return null;
    }
    
    logEvent("Attempting to get file with ID: " + fileId, getConfig().logLevelDebug);
    
    // Access file with more robust error handling
    try {
      var file = DriveApp.getFileById(fileId);
      if (!file) {
        logEvent("File not found for ID: " + fileId, getConfig().logLevelError);
        return null;
      }
      
      var blob = file.getBlob();
      if (!blob) {
        logEvent("Could not get blob from file: " + fileId, getConfig().logLevelError);
        return null;
      }
      
      var content = blob.getDataAsString();
      logEvent("Retrieved code from file: " + file.getName(), getConfig().logLevelDebug);
      return content;
    } catch (fileError) {
      logEvent("DriveApp.getFileById failed: " + fileError + " (fileId: " + fileId + ")", getConfig().logLevelError);
      console.log("DriveApp.getFileById failed: " + fileError + " (fileId: " + fileId + ")");
      return null;
    }
  } catch (e) {
    logEvent("getCodeFromDriveUrl general error: " + e, getConfig().logLevelError);
    console.log("getCodeFromDriveUrl general error: " + e);
    return null;
  }
}
