const fs = require("fs");
const path = require("path");
const esprima = require("esprima");
const esmangle = require("esmangle");
const escodegen = require("escodegen");

const code = fs.readFileSync(path.resolve(__dirname, "../client/client.js"), {
  encoding: "utf8",
});

const ast = esprima.parse(code);
const result = esmangle.mangle(ast);
const minifiedCode = escodegen.generate(result, {
  format: {
    renumber: true,
    escapeless: true,
    compact: true,
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
