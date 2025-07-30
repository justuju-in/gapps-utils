// config.js - Centralized configuration for flowchart-judge
// All configurable variables and sheet names

var CONFIG = {
  masterSheet: 'Master',
  logEventSheet: 'event-log',
  metaSheet: 'Meta',
  geminiApiKeyProperty: 'GEMINI_API_KEY', // Fixed to match your script property name
  domjudgeApiUrl: 'https://judge.csbasics.in/api/v4',
  domjudgeContestId: '2',
  domjudgeTeamId: '5',
  domjudgeUser: 'Student01',
  domjudgePass: 'Ppassword@123',
  geminiModel: 'gemini-2.5-flash',
  geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  logLevelDebug: 1,
  logLevelError: 2,
  loggingLevel: 2,
  domjudgeAdminUser:"shanti",
  domjudgeAdminPass:"shanti@justuju.in",
  masterSheetColumns: [
    'Timestamp',
    'Email Address',
    'Problem Number',
    'Upload your Flowchart',
    'Status',
    'Generated Code',
    'Submission ID',
    'Verdict'
  ],
  metaSheetColumns: [
    'Problem Code',
    'Problem ID'
  ],
  domjudgeSubmissionColumns: [
    'Submission ID',
    'Problem ID',
    'Verdict'
  ]
};

function getConfig() {
  return CONFIG;
}
