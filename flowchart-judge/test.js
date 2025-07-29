function testGeminiDrivePDF() {
  const fileId = '1ZqENxlA4PpXHWbKXb-Y74Du-wcQL0Vz8';
  const prompt = getPrompt();
  const result = callGeminiWithDrivePDF(fileId, prompt);
  Logger.log(result);
}
