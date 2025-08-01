function callGeminiWithDrivePDF(fileId, promptText, temperature = 0) {
  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty(getConfig().geminiApiKeyProperty);
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in script properties.");
  }
  const endpoint = getConfig().geminiEndpoint + getConfig().geminiModel + `:generateContent?key=${GEMINI_API_KEY}`;

  const blob = DriveApp.getFileById(fileId).getBlob();
  const mimeType = blob.getContentType();
  const fileBase64 = Utilities.base64Encode(blob.getBytes());

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: fileBase64
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: temperature
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch(endpoint, options);
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  const json = JSON.parse(body);

  if (code !== 200) {
    throw new Error(`Gemini API error (${code}): ${body}`);
  }

  return json.candidates[0].content.parts[0].text;
}