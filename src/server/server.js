var express = require("express");

var app = express();

app.use(express.json());

app.post("/collect", function (request, response) {
  console.log(request.body);
  response.send(request.body);
});

app.listen(3000);
