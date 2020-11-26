const { Builder } = require("selenium-webdriver");
const fs = require("fs");
const path = require("path");
const assert = require("assert").strict;
const openTunnel = require("./open-tunnel");
const startTestServer = require("./test-server");

const remoteHub = process.env.CROSSBROWSERTESTING_URL;
const username = process.env.CROSSBROWSERTESTING_USERNAME;
const authkey = process.env.CROSSBROWSERTESTING_AUTHKEY;

const PORT = 8881;
const pageUrl = `http://test-website.example:${PORT}/`;
const reportCookiesUrl = `http://test-report-cookies.example:${PORT}/collect`;
const thirdPartyScriptSrc = `http://test-third-party.example:${PORT}/script`;
const clientScript = fs.readFileSync(
  path.resolve(__dirname, "../../dist/client.js"),
  "utf-8"
);

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function findReport(reports, urlPath) {
  return reports.find((report) => {
    try {
      reportData = JSON.parse(report);
    } catch (err) {
      return false;
    }
    if (reportData.viewUrl.endsWith(urlPath)) {
      return true;
    }
  });
}

async function test(testName, driver, reports) {
  // Report session details
  // const session = await driver.getSession();
  // sessionId = session.id_;
  // console.log(
  //   "Test URL https://app.crossbrowsertesting.com/selenium/" + sessionId
  // );

  try {
    const urlPath = Math.floor(Math.random() * 0x7fffffff).toString(32);

    // Load up the test page with the client integration
    await driver.get(pageUrl + encodeURIComponent(testName) + "/" + urlPath);

    // Wait for the script to drop the cookie
    await wait(5000);

    // Navigate away from the page to cause the report to be sent
    await driver.get("about:blank");

    // Wait for report to be received
    await wait(5000);

    // Assert that the report was be received
    const beaconRequest = findReport(reports, urlPath);
    assert.notStrictEqual(
      beaconRequest,
      undefined,
      `${testName} should have called the collect endpoint`
    );
  } catch (err) {
    console.error("Error running test", err);
    throw err;
  } finally {
    await driver.quit();
  }
}

(async function runTests() {
  // Open SSH tunnel to test grid
  const closeTunnel = await openTunnel();

  // Start a stub HTTP server and collect reports
  const reports = [];
  const stopTestServer = await startTestServer(
    PORT,
    clientScript + `;reportCookies("${reportCookiesUrl}",0);`,
    thirdPartyScriptSrc,
    (report) => reports.push(report)
  );

  // Define the browsers to run tests in
  const browsers = [
    {
      name: "Chrome 86 Windows Desktop",
      browserName: "Chrome",
      version: "86x64",
      platform: "Windows 10",
    },
    {
      name: "IE 9",
      browserName: "Internet Explorer",
      version: "9",
      platform: "Windows 7 64-Bit",
      initialBrowserUrl: "about:blank",
      ignoreProtectedModeSettings: "true",
      record_video: "true",
    },
    {
      name: "Safari 8 Desktop",
      browserName: "Safari",
      version: "8",
      platform: "Mac OSX 10.10",
    },
    {
      name: "Edge 86 Desktop",
      browserName: "MicrosoftEdge",
      version: "86",
      platform: "Windows 10",
    },
    {
      name: "Firefox 82 Windows Desktop",
      browserName: "Firefox",
      version: "82x64",
      platform: "Windows 10",
    },
    {
      name: "Safari 9 Mobile",
      browserName: "Safari",
      deviceName: "iPad Pro Simulator",
      platformVersion: "9.3",
      platformName: "iOS",
      deviceOrientation: "landscape",
    },
    {
      name: "Chrome Android",
      browserName: "Chrome",
      deviceName: "Galaxy Tab S5E",
      platformVersion: "9.0",
      platformName: "Android",
      deviceOrientation: "portrait",
    },
  ];

  // Run tests in parallel
  const tests = browsers.map((browser) => {
    const testName = browser.name;
    const capabilities = {
      username: username,
      password: authkey,
      ...browser,
    };
    const driver = new Builder()
      .usingServer(remoteHub)
      .withCapabilities(capabilities)
      .build();

    console.log("Running test in " + testName);
    return test(testName, driver, reports);
  });

  const results = await Promise.allSettled(tests);

  console.log("Reports", JSON.stringify(reports.map(JSON.parse), null, 2));
  console.log("Results", results);

  await stopTestServer();

  await closeTunnel();

  if (results.some(({ status }) => status !== "fulfilled")) {
    // Exist with a non-zero code if any tests failed
    console.log("Failed");
    return process.exit(1);
  }

  // Success
  console.log("Success");
  process.exit(0);
})();
