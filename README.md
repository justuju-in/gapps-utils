# Flowchart Judge Apps Script

Production-ready modular Google Apps Script for automated flowchart evaluation, code generation, and verdict polling using Gemini and DomJudge.

## Features
- Modular code: helpers, config, logging, Gemini, DomJudge, polling, meta mapping
- Centralized config for all sheet names, credentials, and API endpoints
- Error/event logging to Google Sheet
- Easy to maintain and extend

## Getting Started

### 1. Setting up the repo locally
- Clone this repo:
  ```bash
  git clone <your-github-repo-url>
  cd <repo-folder>
  ```
- Add your `.env` file for secrets and environment variables ([see clasp docs](https://developers.google.com/apps-script/guides/clasp)).
- Install dependencies (if any, e.g. for local testing):
  ```bash
  npm install
  ```
- Start coding!
  - Edit any `.js` file in the repo.
  - All config changes go in `config.js`.
  - Use triggers for `onFormSubmit` and `pollVerdicts` in the Apps Script UI.

### 2. Setting up clasp
- Install clasp and clas-env:
  ```bash
  npm install -g @google/clasp
  npm install -g clasp-env
  ```
- Authenticate with Google:
  ```bash
  clasp login
  ```
## Development
- Use clasp and clasp-env commands to pull/push code to Apps Script (dev/prod) after making changes:
  - Pull latest code from dev or prod:
    ```bash
    npm run pull:dev # or npm run pull:prod
    ```
  - Push local changes to dev or prod:
    ```bash
    npm run push:dev # or npm run push:prod
    ```
  - Deploy to production:
    ```bash
    npm run push:prod
    ```
  - Deploy to development:
    ```bash
    npm run push:dev
    ```
- Keep your `.env` file private and do not commit secrets to GitHub.

## Pipeline & Automation
- The pipeline is fully modular and trigger-based.
- The `Status` column in the master sheet controls all workflow steps:
  - `NEW`: Ready for Gemini processing
  - `GEMINI_DONE`: Ready for DomJudge submission
  - `JUDGE_SUBMITTED`: Ready for verdict polling
  - `VERDICT_READY`: Verdict available
- Each trigger function processes only the relevant rows based on `Status`.
- You can automate triggers using time-based Apps Script triggers for polling and batch processing.

## Structure
- `config.js` — all settings and sheet names
- `helpers.js` — utility functions
- `logger.js` — error/event logging
- `meta.js` — problem code mapping
- `gemini.js` — Gemini API integration
- `judge.js` — DomJudge submission
- `poll.js` — verdict polling
- `Code.js` — main pipeline

## Notes
- All config changes in `config.js`
- Use triggers for `onFormSubmit` and all pipeline steps
- Logging is automatic

---
Made for Google Apps Script + clasp.
