const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..", "src");
const vietnamese = /[À-ỹ]/u;
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(file);
  }
}

walk(root);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  function visit(node) {
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      const value = ts.isTemplateExpression(node) ? source.slice(node.getStart(ast), node.end) : node.text;
      if (vietnamese.test(value)) {
        const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
        let parent = node.parent;
        while (parent && !ts.isFunctionDeclaration(parent) && !ts.isFunctionExpression(parent) && !ts.isArrowFunction(parent) && !ts.isMethodDeclaration(parent)) parent = parent.parent;
        const scope = parent ? parent.name?.getText(ast) || parent.parent?.name?.getText(ast) || "<anonymous>" : "<module>";
        found.push(`${position.line + 1}\t${ts.SyntaxKind[node.kind]}\t${scope}\t${value.replace(/\s+/g, " ").slice(0, 110)}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (found.length) {
    console.log(`\n${path.relative(root, file)} (${found.length})`);
    console.log(found.join("\n"));
  }
}
