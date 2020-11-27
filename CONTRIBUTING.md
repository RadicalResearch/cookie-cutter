# Contributing

Improvements, bug fixes and suggestions are welcome.

## Testing

The client script is fairly simple, but is expected to work in most browsers so
we rely on automated testing to validate the code.

Automation testing uses the following test domains. To run tests locally these
will need to be configured to resolve to the
[test server](test/automation/test-server.js). Add the following entries to your
`/etc/host` file.

```
127.0.0.1	test-website.example
127.0.0.1	test-report-cookies.example
127.0.0.1	test-third-party.example
```

To tun the tests locally you will also need to set the following environment
variables to authenticate with the CrossBrowserTesting.com service where the
tests are executed. Alternatively you can set these in the `.env` file at the
root of the project.

```
CROSSBROWSERTESTING_USERNAME=<your username>
CROSSBROWSERTESTING_AUTHKEY=<your auth key>
CROSSBROWSERTESTING_URL=http://hub-cloud.crossbrowsertesting.com:80/wd/hub
```

To run the tests run

```
npm test
```

This will automatically build the code before running the tests

## Building

The client code is minified using `esprima`, `escodegen` and `esmangle` tools.
To build the minified client code to the `/dist/` directory run

```
npm run build
```
