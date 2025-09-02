/**
 * Logging utility for the application.
 * Provides functions for logging events to console and sheet.
 */

/**
 * Logs an event to console and optionally to a log sheet.
 * @param {string} message - The message to log.
 * @param {number} level - The log level (1 for DEBUG, 2 for ERROR).
 */
function logEvent(message, level) {
  try {
    // Only log if the level is >= current logging level
    if (level >= getConfig().loggingLevel) {
      const levelString = (level === getConfig().logLevelDebug) 
        ? getConfig().logDebugString 
        : getConfig().logErrorString;
      
      console.log(`[${levelString}] ${message}`);
      
      // Log to sheet if it exists
      const logSheetName = getConfig().logEventSheet;
      if (logSheetName) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let logSheet = ss.getSheetByName(logSheetName);
        
        // Create log sheet if it doesn't exist
        if (!logSheet) {
          logSheet = ss.insertSheet(logSheetName);
          logSheet.appendRow([
            getConfig().logDateHeader,
            getConfig().logLevelHeader,
            getConfig().logMessageHeader
          ]);
          logSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
        }
        
        // Append log entry
        logSheet.appendRow([
          new Date(),
          levelString,
          message
        ]);
      }
    }
  } catch (e) {
    console.error("Error logging event: " + e);
  }
}
