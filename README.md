# LeetCode Status Updater (Apps Script)

This project fetches the problem status of all users from leetcode for a given set of problems. 

## Sheets layout (required)

- **Sheet 1:** `DSA practice problems - first pass`  
  - **A:** `Problem name`  
  - **B:** `Problem link` — must look like `https://leetcode.com/problems/<titleSlug>/description/`  
  - Rows with empty links are ignored.

- **Sheet 2:** `student_tracker`  
  - **Row 1 (from column B):** usernames (LeetCode handles)  
  - **Column A (from row 2):** problem names  
  - Cells at the intersection (problem row × username column) store latest status.

## What the scripts do

### `AddProblemNamesToStudentTracker.js`
- **Function:** `addNewProblemNamesToStudentTracker()`
- **Purpose:** Appends new problem names from `DSA practice problems - first pass` → `student_tracker` Column A (starting row 2), **only** if a problem link exists and the problem isn’t already listed.

### `UpdateStudentTracker.js`
- **Function:** `updateLeetcodeStatuses()`
- **Purpose:** For each username in `student_tracker` row 1 (B1 → …):
  1. Fetches the user’s **last 20** LeetCode submissions via GraphQL.
  2. Matches each problem row by extracting `titleSlug` from the link in `DSA practice problems - first pass`.
  3. Writes `statusDisplay` into the corresponding cell if it’s empty **or** higher priority.

**Status priority (best → worst):**

| Priority | Status                   |
|:--------:|--------------------------|
| 1        | Accepted                 |
| 2        | Wrong Answer             |
| 3        | Time Limit Exceeded      |
| 4        | Runtime Error            |
| 5        | Compile Error            |
| 6        | Memory Limit Exceeded    |
| 7        | Presentation Error       |

```
Accepted (1) < Wrong Answer (2) < Time Limit Exceeded (3) < Runtime Error (4)
< Compile Error (5) < Memory Limit Exceeded (6) < Presentation Error (7)
```

## Quick start (Apps Script)

1. Open the spreadsheet → **Extensions → Apps Script**.
2. Add both files (or paste both scripts into your Apps Script project).
3. Ensure the two sheet names match exactly:
   - `DSA practice problems - first pass`
   - `student_tracker`
4. Run in order:
   - `addNewProblemNamesToStudentTracker()`
   - `updateLeetcodeStatuses()`
5. Approve permissions when prompted (Spreadsheet + External URL fetch).

## Optional: triggers

- To keep statuses fresh, set a time-driven trigger on `updateLeetcodeStatuses()` (e.g., hourly).  
  Apps Script Editor → **Triggers** → **Add Trigger** → choose function & schedule.

## Notes / assumptions

- **LeetCode API:** Uses `https://leetcode.com/graphql` without auth; rate limits may apply.
- **Matching logic:** Relies on extracting `titleSlug` from links like  
  `https://leetcode.com/problems/<slug>/description/`. If your links differ (e.g., missing `/description/`), adjust the regex in `extractTitleSlug()`:
  ```js
// Match both with and without trailing /description/
// e.g., https://leetcode.com/problems/two-sum/description/
//    or https://leetcode.com/problems/two-sum/
const regex = /leetcode\.com\/problems\/([^/]+)/;
```
- **Only last 20 submissions:** If a student solved an older problem, it won’t be detected unless it’s in their latest 20.
- **Case sensitivity:** Usernames must match LeetCode handles exactly.
- **Resilience:** If a cell already has a better status (by priority), it won’t be downgraded.

