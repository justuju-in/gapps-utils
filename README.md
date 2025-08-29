# Flowchart Judge Apps Script

A Google Apps Script application that automates flowchart evaluation. The system converts student-submitted flowcharts to code using Gemini AI, submits the code to DomJudge for testing, and polls for verdicts.

## 1. Development Setup

### Prerequisites

1. Google Account with access to:
   - Google Apps Script
   - Google Drive
   - Google Sheets

2. Install required tools:
   ```bash
   npm install -g @google/clasp
   npm install -g clasp-env
   ```

3. Authentication:
   ```bash
   clasp login
   ```

### Setting Up Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/justuju-in/gapps-utils.git
   cd gapps-utils
   ```

### Development Workflow

1. Make changes to the code files locally
2. Test in development environment:
   ```bash
   npm run push:dev
   ```
3. When ready for production:
   ```bash
   npm run push:prod
   ```

## 2. Using the Script in Production

### Setting Up in Google Sheets

1. Create a new Google Sheet or open an existing one
2. Go to Extensions > Apps Script
3. Deploy this script to your sheet
4. Set up the following triggers in the Apps Script dashboard:
   - `onFormSubmit`: Triggers when a new form submission comes in
   - `triggerGeminiProcessing`: Set up on a time-based trigger (e.g., every 15 minutes)
   - `triggerDomJudgeProcessing`: Set up on a time-based trigger (e.g., every 15 minutes)
   - `triggerVerdictPolling`: Set up on a time-based trigger (e.g., every 5 minutes)

### Initial Pipeline Setup

1. **Google Form Setup**:
   - Create a Google Form with fields matching the column names in `config.js`
   - Ensure the flowchart upload field accepts PDF or image files
   - Connect the form to your Google Sheet

2. **Script Properties Setup**:
   - In the Apps Script editor, go to Project Settings > Script Properties
   - Add the required API keys:
     - `GEMINI_API_KEY`: Your Gemini API key for AI processing

3. **Sheet Setup**:
   - The script will automatically create the Master Sheet
   - Required columns are defined in `config.js` under `masterSheetColumns`
   - Create a "Meta" sheet with problem codes and their DomJudge IDs

### Configuration

All configuration is done in `config.js`:
- Sheet column names
- Status codes
- API endpoints
- Credentials
- Gemini settings

### Pipeline Entry Points and Workflow

1. **Entry Points**:
   - **Google Form Submissions**: The main entry point - when students submit flowcharts
   - **Custom Menu**: Access via "Evaluate Flowcharts" menu in Google Sheets
   - **Time-based Triggers**: For automatic processing at scheduled intervals

2. **Starting the Pipeline**:
   - **Automatic Start**: Pipeline begins when the `onFormSubmit` trigger fires
   - **Manual Start**: Use the custom menu in Google Sheets to process specific stages
   - **Full Processing**: Click "Run on All Unprocessed Rows" to process all pending submissions

3. **Processing Workflow**:
   - Row status starts as `NEW`
   - Gemini AI processes the flowchart and generates code (`processFlowchartWithGemini`)
   - Status changes to `GEMINI_DONE`
   - Code is submitted to DomJudge (`submitCodeToDomJudge`)
   - Status changes to `JUDGE_SUBMITTED`
   - Verdict is polled from DomJudge (`pollVerdictForSubmission`)
   - Status changes to `VERDICT_READY` when complete

4. **How to Proceed**:
   - Set up Google Form to collect flowchart submissions
   - Connect form responses to your Master Sheet
   - Configure API keys in Script Properties
   - Set up automatic triggers for each pipeline stage
   - Monitor the Master Sheet for status updates
   - Check the event-log sheet for any errors or issues

### Key Files

- `Code.js`: Main workflow and pipeline
- `config.js`: All configuration settings
- `Gemini.js`: Gemini AI integration
- `judge.js`: DomJudge submission
- `poll.js`: Verdict polling
- `helpers.js`: Utility functions
- `logger.js`: Logging functions

## Complete Pipeline Flow

```
Form Submission → onFormSubmit() → NEW entry in Master Sheet
                                    ↓
                  triggerGeminiProcessing() → processFlowchartWithGemini()
                                    ↓
                                GEMINI_DONE
                                    ↓
                triggerDomJudgeProcessing() → submitCodeToDomJudge()
                                    ↓
                              JUDGE_SUBMITTED
                                    ↓
                   triggerVerdictPolling() → pollVerdictForSubmission()
                                    ↓
                              VERDICT_READY
```

## Troubleshooting

### General Issues
- Check the "event-log" sheet for error logs and debugging information
- Verify API keys and credentials in script properties
- Ensure proper Google Form setup with correct column names
- Check DomJudge connection if submissions are failing

### Pipeline-Specific Issues

1. **Submissions Stuck at NEW Status**:
   - Check if `triggerGeminiProcessing` trigger is active
   - Verify Gemini API key is valid
   - Check flowchart URL is accessible and file is readable

2. **Submissions Stuck at GEMINI_DONE**:
   - Check if `triggerDomJudgeProcessing` trigger is active
   - Verify DomJudge credentials in config.js
   - Check problem ID mapping in the Meta sheet

3. **Submissions Stuck at JUDGE_SUBMITTED**:
   - Check if `triggerVerdictPolling` trigger is active
   - Verify DomJudge API is reachable
   - Check if the submission was received by DomJudge

4. **Manual Intervention**:
   - Use the "Evaluate Flowcharts" menu to manually trigger specific stages
   - For debugging, you can use "Run on All Unprocessed Rows" to retry all pending items

---
Made for Google Apps Script + clasp
