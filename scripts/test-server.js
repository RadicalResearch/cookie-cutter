const fs = require("fs");
const path = require("path");
const startTestServer = require("../test/automation/test-server");

const PORT = 8881;
const reportCookiesUrl = `http://test-report-cookies.example:${PORT}/collect`;
const thirdPartyScriptSrc = `http://test-third-party.example:${PORT}/script`;
const clientScript = fs.readFileSync(
  path.resolve(__dirname, "../dist/client.js"),
  "utf-8"
);

startTestServer(
  PORT,
  clientScript + `;reportCookies("${reportCookiesUrl}",0);`,
  thirdPartyScriptSrc,
  (report) => console.log(report)
);
