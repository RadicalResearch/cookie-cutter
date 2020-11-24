const {
  Builder,
  Capabilities,
  Capability,
  Browser,
} = require("selenium-webdriver");
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

async function test(driver, requests) {
  // Report session details
  const session = await driver.getSession();
  sessionId = session.id_;
  console.log("Session ID: ", sessionId);
  console.log(
    "See your test run at: https://app.crossbrowsertesting.com/selenium/" +
      sessionId
  );

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

  // Record HTTP requests
  await startTestServer((request, body) => {
    requests.push({ request, body });
  });

  const browsers = [
    {
      [Capability.BROWSER_NAME]: Browser.INTERNET_EXPLORER,
      [Capability.PLATFORM_NAME]: "Windows 7",
      [Capability.BROWSER_VERSION]: "8",
    },
    {
      [Capability.BROWSER_NAME]: Browser.EDGE,
      [Capability.PLATFORM_NAME]: "Windows 10",
      [Capability.BROWSER_VERSION]: "86",
    },
    {
      [Capability.BROWSER_NAME]: Browser.SAFARI,
      [Capability.PLATFORM_NAME]: "Mac OSX 10.10",
      [Capability.BROWSER_VERSION]: "8",
    },
    {
      [Capability.BROWSER_NAME]: Browser.FIREFOX,
      [Capability.PLATFORM_NAME]: "Windows 10",
      [Capability.BROWSER_VERSION]: "82x64",
    },
    {
      [Capability.BROWSER_NAME]: Browser.CHROME,
      [Capability.PLATFORM_NAME]: "Windows 10",
      [Capability.BROWSER_VERSION]: "86x64",
    },
  ];

  // Run tests in parallel
  const tests = browsers.map((browser) => {
    const capabilities = new Capabilities(browser)
      .set("username", username)
      .set("password", authkey)
      .set("record_network", "true");

    const driver = new Builder()
      .usingServer(webDriverServerUrl)
      .withCapabilities(capabilities)
      .build();

    console.log("running test in browser", browserName);
    return test(browserName, requests);
  });

  const results = await Promise.allSettled(tests);

  console.log("results", results);
  console.log("requests", requests);

  process.exit(0);
})();
