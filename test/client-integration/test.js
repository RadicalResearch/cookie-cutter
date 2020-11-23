const { Builder } = require("selenium-webdriver");
const safari = require("selenium-webdriver/safari");
const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const edge = require("selenium-webdriver/edge");
const ie = require("selenium-webdriver/ie");
const assert = require("assert").strict;

const openTunnel = require("./open-tunnel");
const startTestServer = require("./start-test-server");

const webDriverServerUrl = process.env.CROSSBROWSERTESTING_URL;
const username = process.env.CROSSBROWSERTESTING_USERNAME;
const authkey = process.env.CROSSBROWSERTESTING_AUTHKEY;

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function getBeaconRequest(requests, urlPath, cookieName) {
  return requests.find((request) => {
    if (!request.body) {
      return false;
    }
    var body;
    try {
      body = JSON.parse(r.body);
    } catch (err) {
      return false;
    }
    if (body.viewUrl.endsWith(urlPath)) {
      if (body.reports.some((report) => report.name === cookieName)) {
        return true;
      }
    }
  });
}

async function test(browserName, requests) {
  const driver = new Builder()
    .usingServer(webDriverServerUrl)
    // Modern Edge
    .setEdgeOptions(new edge.Options().getPlatform("Windows 10"))
    // Modern Firefox
    .setFirefoxOptions(new firefox.Options().setPlatform("Windows 10"))
    // Modern Chrome
    .setChromeOptions(new chrome.Options().setPlatform("Windows 10"))
    // Old IE
    .setIeOptions(new ie.Options().setPlatform("Windows 8"))
    // Old Safari
    .setSafariOptions(new safari.Options().setBrowserVersion("8"))
    .withCapabilities({
      username: username,
      password: authkey,
    })
    .forBrowser(browserName)
    .build();

  try {
    const urlPath = Math.floor(Math.random() * 0x7fffffff).toString(32);

    // Load up the test page with the client integration
    await driver.get("http://localhost.example.com:8080/" + urlPath);

    // Set a large cookie
    await driver.executeScript(
      'document.cookie = "TestCookie=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;Foo=bar"'
    );

    // Navigate away from the page
    await driver.get("about:blank");

    // Wait around for beacon to be sent
    await wait(10000);

    // Assert that the beacon was sent
    const beaconRequest = getBeaconRequest(requests, urlPath, "TestCookie");
    assert.notStrictEqual(
      beaconRequest,
      undefined,
      `${browserName} should have called the collect endpoint`
    );
  } catch (err) {
    console.error("Error running test", err);
    throw err;
  } finally {
    await driver.quit();
  }
}

(async function runTests() {
  await openTunnel();
  const requests = [];
  await startTestServer((request, body) => {
    requests.push({ request, body });
  });
  const browserNames = [
    "internet explorer",
    "edge",
    "safari",
    "firefox",
    "chrome",
  ];

  // Run tests in parallel
  const tests = browserNames.map((browserName) => {
    console.log("running test in browser", browserName);
    return test(browserName, requests);
  });

  const results = await Promise.allSettled(tests);

  console.log("results", results);
  console.log("requests", requests);

  process.exit(0);
})();
