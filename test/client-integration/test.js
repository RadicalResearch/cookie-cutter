const { Builder } = require("selenium-webdriver");
const safari = require("selenium-webdriver/safari");
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

async function test(browserName, requests) {
  const driver = new Builder()
    .usingServer(webDriverServerUrl)
    .setSafariOptions(new safari.Options().setBrowserVersion("8"))
    .withCapabilities({
      username: username,
      password: authkey,
    })
    .forBrowser(browserName)
    .build();

  try {
    const urlPath = Math.random().toString(32);

    // Load up the test page with the client integration
    await driver.get("http://localhost:8080/" + urlPath);

    // Set a large cookie
    await driver.executeScript(
      'document.cookie = "TestCookie=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;Foo=bar"'
    );

    // Navigate away from the page
    await driver.get("about:blank");

    // Wait around for beacon to be sent
    await wait(2000);

    // Assert that the beacon was sent
    assert.ok(
      requests.some((r) => {
        var body = JSON.parse(r.body);
        return (
          body.viewUrl.endsWith(urlPath) && body.reports[0].name == "TestCookie"
        );
      }),
      "the collect endpoint should have been called"
    );
  } catch (err) {
    console.error(err);
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
  const browserNames = ["edge", "safari", "firefox", "chrome"];

  // Run tests in parallel
  const tests = browserNames.map((browserName) => {
    console.log("running test in browser", browserName);
    return test(browserName, requests);
  });

  await Promise.all(tests);

  process.exit(0);
})();
