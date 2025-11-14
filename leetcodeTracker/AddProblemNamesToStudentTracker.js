function addNewProblemNamesToStudentTracker() {
  // Open the spreadsheet and get the sheets
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName("DSA practice problems - first pass");
  var targetSheet = ss.getSheetByName("student_tracker");
  
  // Get all data from the source sheet (problem names and links)
  var data = sourceSheet.getDataRange().getValues();
  
  var lastRow = 2;
  if (targetSheet.getLastRow() > lastRow) {
    lastRow = targetSheet.getLastRow();
  }

  // Get all existing problem names from the student_tracker sheet
  var existingProblems = targetSheet.getRange(2, 1, lastRow, 1).getValues().flat();
  
  // Initialize an array to store new problem names
  var newProblemNames = [];
  
  // Loop through the rows in the source sheet to find new problem names
  for (var i = 1; i < data.length; i++) { // Start from 1 to skip header row
    var problemName = data[i][0]; // Problem name is in the first column
    var problemLink = data[i][1]; // Problem link is in the second column
    
    // If the problem link is not empty and the problem name is not already in the target sheet
    if (problemLink !== "" && existingProblems.indexOf(problemName) === -1) {
      newProblemNames.push([problemName]); // Add problem name to the list as a single element array
    }
  }
  if (lastRow == 2) {
    lastRow -= 1;
  }
  // If there are new problem names, append them to the student_tracker sheet
  if (newProblemNames.length > 0) {
    targetSheet.getRange(lastRow + 1, 1, newProblemNames.length, 1).setValues(newProblemNames);
  }
}
