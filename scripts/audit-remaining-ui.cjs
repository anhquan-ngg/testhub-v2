const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.join(__dirname, "..", "src");
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(ts|tsx)$/.test(file) ? [file] : [];
  });
}
for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  function visit(node) {
    let value;
    if (ts.isJsxText(node)) value = node.text;
    else if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent) && /^(title|placeholder|alt|aria-label|label|name)$/.test(node.parent.name.text)) value = node.text;
    if (value && /[A-Za-zÀ-ỹ]/u.test(value) && !/^\s*(?:[A-F]|[0-9]+|\/|%|\.\.\.)\s*$/.test(value)) {
      const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
      found.push(`${line}\t${value.replace(/\s+/g, " ").trim().slice(0, 100)}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (found.length) console.log(`\n${path.relative(root, file)} (${found.length})\n${found.join("\n")}`);
}
