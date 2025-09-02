/**
 * Main entry point and event handlers.
 * This file serves as the primary entry point for the flowchart judge application.
 */

/**
 * Triggered when the spreadsheet is opened.
 * Creates the custom menu in the Google Sheets UI.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Evaluate Flowcharts")
    .addItem("Process Gemini", "triggerGeminiProcessing")
    .addItem("Process DomJudge", "triggerDomJudgeProcessing")
    .addItem("Poll Verdict", "triggerVerdictPolling")
    .addToUi();
}

/**
 * Triggered when a form is submitted.
 * Delegates to the form submission service to handle the submission.
 * @param {Object} e - The form submission event.
 */
function onFormSubmit(e) {
  processFormSubmission(e);
}
