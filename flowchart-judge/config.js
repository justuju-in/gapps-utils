// config.js - Centralized configuration for flowchart-judge
// All configurable variables and sheet names

var CONFIG = {
  masterSheet: 'Master',
  logEventSheet: 'event-log',
  metaSheet: 'Meta',
  geminiApiKeyProperty: 'GOOGLE_API_KEY',
  domjudgeApiUrl: 'https://judge.csbasics.in/api/v4',
  domjudgeContestId: '1',
  domjudgeTeamId: '5',
  domjudgeUser: 'Student01',
  domjudgePass: 'Ppassword@123',
  geminiModel: 'gemini-2.5-flash',
  geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  logLevelDebug: 1,
  logLevelError: 2,
  loggingLevel: 2,
};

function getConfig() {
  return CONFIG;
}
