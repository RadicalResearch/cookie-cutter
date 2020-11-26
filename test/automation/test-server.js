const http = require("http");

function startTestServer(
  port,
  clientScript,
  thirdPartyScriptSrc,
  reportCallback
) {
  // OPTIONS /collect - CORS preflight checks
  function handlePreflight(req, res) {
    // Safari seem to be very picky about the allowed headers so we explicitly
    // allow whatever it asks for, rather than *.
    const requestOrigin = req.headers["origin"] || "*";
    const requestHeaders = req.headers["access-control-request-headers"] || "*";
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", requestHeaders);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
    res.writeHead(204); // No Content
    res.end();
  }

  // POST /collect - cookie reports
  function handleReport(req, res) {
    let body = [];
    req
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        body = Buffer.concat(body).toString();
        reportCallback(body);
      });
    res.setHeader("Content-type", "text/plain");
    // Safari 9 on iOS doesn't send a pre-flight OPTIONS request, it sends the
    // POST but expects the CORS headers in the response.
    const requestOrigin = req.headers["origin"] || "*";
    const requestHeaders = req.headers["access-control-request-headers"] || "*";
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", requestHeaders);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
    res.writeHead(204); // OK
    res.end();
  }

  // GET /* - test page
  function handlePage(req, res) {
    res.writeHead(200);
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Test Document</title>
<!-- Include the client code inline  -->
<script>${clientScript}</script>
</head>
<body>
<h1>Test Document</h1>
<a href="about:blank">about:blank</a>
<!-- Third party script that sets a first party cookie -->
<script src=${thirdPartyScriptSrc}></script>
</body>
</html>`);
  }

  // GET /script - test script that sets a large cookie
  function handleSetCookieScript(req, res) {
    res.setHeader("Content-type", "text/javascript");
    res.writeHead(200);
    res.end(
      `document.cookie = "test-cookie-${Math.floor(
        Math.random() * 0x7fffffff
      ).toString(32)}=${"a".repeat(500)}"`
    );
  }

  // Start the server
  return new Promise(function (resolve) {
    const server = http
      .createServer(function requestListener(req, res) {
        if (req.url.startsWith("/collect")) {
          if (req.method === "OPTIONS") {
            return handlePreflight(req, res);
          } else if (req.method === "POST") {
            return handleReport(req, res);
          }
        }
        if (req.url.startsWith("/script")) {
          return handleSetCookieScript(req, res);
        }
        return handlePage(req, res);
      })
      .listen(port, () => {
        // Resolve with a function that stops the server
        resolve(function () {
          server.close();
        });
      });
  });
}

module.exports = startTestServer;
