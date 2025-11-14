function updateLeetcodeStatuses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const studentTrackerSheet = sheet.getSheetByName("student_tracker");
  const problemSheet = sheet.getSheetByName("DSA practice problems - first pass");

  const usernames = studentTrackerSheet.getRange(1, 2, 1, studentTrackerSheet.getLastColumn() - 1).getValues().flat();
  const problemNames = problemSheet.getRange(2, 1, problemSheet.getLastRow() - 1, 1).getValues().flat();
  const problemLinks = problemSheet.getRange(2, 2, problemSheet.getLastRow() - 1, 1).getValues().flat();

  console.log(usernames);
  // Priority order for statuses
  const statusPriority = {
    "Accepted": 1,
    "Wrong Answer": 2,
    "Time Limit Exceeded": 3,
    "Runtime Error": 4,
    "Compile Error": 5,
    "Memory Limit Exceeded": 6,
    "Presentation Error": 7
  };

  // For each username (from row 2 onwards in "student_tracker")
  for (let userIndex = 0; userIndex < usernames.length; userIndex++) {
    const username = usernames[userIndex];

    // Fetch last 20 submissions from Leetcode using GraphQL
    const submissions = fetchLeetcodeSubmissions(username);
    
    // Loop through the problems column and see it there is a submission for that problem
    const problems = studentTrackerSheet.getRange(2, 1, studentTrackerSheet.getLastRow() - 1, 1).getValues().flat();
    
    for (let i = 0; i < problems.length; i++) {
      let link = problemLinks[problemNames.indexOf(problems[i])];
      let currTitleSlug = extractTitleSlug(link);

      for (let j = 0; j < submissions.length; j++) {
        if (submissions[j].titleSlug == currTitleSlug) {
          const currentStatus = studentTrackerSheet.getRange(i+2, userIndex+2).getValue();

          if (!currentStatus || statusPriority[submissions[j].statusDisplay] < statusPriority[currentStatus]) {
            studentTrackerSheet.getRange(i + 2, userIndex + 2).setValue(submissions[j].statusDisplay);
          }
        }
      }
    }
  }
}

// Fetch last 20 submissions for a given username using GraphQL
function fetchLeetcodeSubmissions(username) {
  const query = `
    query {
      recentSubmissionList(username: "${username}") {
        id
        lang
        runtime
        statusDisplay
        timestamp
        title
        titleSlug
      }
    }
  `;

  const url = "https://leetcode.com/graphql";
  const payload = JSON.stringify({ query: query });

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: payload
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());
    return jsonResponse.data.recentSubmissionList;
  } catch (error) {
    Logger.log("Error fetching data: " + error);
    return [];
  }
}


function extractTitleSlug(url) {
  const regex = /https:\/\/leetcode\.com\/problems\/([^/]+)\/description\//;
  const match = url.match(regex);
  
  if (match && match[1]) {
    return match[1];  // returns the titleSlug (the part after '/problems/' and before '/description/')
  } else {
    return null;  // returns null if the URL format is incorrect
  }
}
