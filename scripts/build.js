const fs = require("fs");
const path = require("path");
const esprima = require("esprima");
const esmangle = require("esmangle");
const escodegen = require("escodegen");

const code = fs.readFileSync(
  path.resolve(__dirname, "../src/client/client.js"),
  {
    encoding: "utf8",
  }
);

let ast = esprima.parse(code);
ast = esmangle.mangle(ast);
const minifiedCode = escodegen.generate(ast, {
  format: {
    renumber: true,
    escapeless: true,
    compact: false,
    semicolons: false,
    parentheses: false,
  },
});

fs.mkdirSync(path.resolve(__dirname, "../dist"), {
  recursive: true,
});

fs.writeFileSync(path.resolve(__dirname, "../dist/client.js"), minifiedCode, {
  encoding: "utf8",
  flag: "w",
});
