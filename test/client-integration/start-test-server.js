const http = require("http");
const fs = require("fs");
const path = require("path");

function startTestServer(collectCallback) {
  const script = fs.readFileSync(
    path.resolve(__dirname, "../../dist/client.js"),
    "utf-8"
  );

  function handleCollect(req, res) {
    let body = [];
    req
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        body = Buffer.concat(body).toString();
        collectCallback(req, body);
      });
    res.writeHead(200);
    res.end("OK");
  }

  function handlePage(req, res) {
    res.writeHead(200);
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Test Document</title>
<script>${script}</script>
</head>
<body>
<!-- Body -->
</body>
</html>`);
  }

  const requests = [];
  return new Promise(function (resolve) {
    http
      .createServer(function requestListener(req, res) {
        if (req.url.startsWith("/collect")) {
          return handleCollect(req, res);
        }
        return handlePage(req, res);
      })
      .listen(80, () => {
        resolve(requests);
      });
  });
}

module.exports = startTestServer;
