const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const ts = require("typescript");
const filename = path.resolve(__dirname, "../src/lib/chapter-tree.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const fixture = new Module(filename, module);
fixture.paths = module.paths;
fixture._compile(compiled, filename);
const { chapterPath, buildChapterPaths, questionBearingChapterIds } =
  fixture.exports;

const nodes = Array.from({ length: 5000 }, (_, i) => ({
  id: String(i),
  name: `Chapter ${i}`,
  parent_id: i ? String(i - 1) : null,
}));
const byId = new Map(nodes.map((node) => [node.id, node]));
assert.equal(chapterPath("4999", byId).split(" > ").length, 5000);
assert.equal(chapterPath("4999", byId, 8).split(" > ").length, 9);
assert.ok(chapterPath("4999", byId, 8).startsWith("… > "));
assert.equal(
  questionBearingChapterIds(nodes, [{ chapter_id: "4999" }]).size,
  5000,
);
assert.equal(
  buildChapterPaths(nodes.slice(0, 1000)).get("999").split(" > ").length,
  1000,
);
const cycle = [
  { id: "a", parent_id: "b", name: "A" },
  { id: "b", parent_id: "a", name: "B" },
];
assert.equal(buildChapterPaths(cycle).size, 2);
assert.equal(questionBearingChapterIds(cycle, [{ chapter_id: "a" }]).size, 2);
assert.equal(chapterPath("missing", byId), "");
assert.equal(
  questionBearingChapterIds(nodes, [{ chapter_id: "missing" }]).size,
  0,
);

const searchable = [
  { id: "root", name: "Root", parent_id: null },
  { id: "child", name: "Child", parent_id: "root" },
  { id: "leaf", name: "Leaf", parent_id: "child" },
  { id: "sibling", name: "Other", parent_id: "root" },
  { id: "orphan", name: "Orphan", parent_id: "missing" },
  { id: "empty", name: "", parent_id: "child" },
  ...cycle,
  { id: "cycle-child", name: "Tail", parent_id: "a" },
];
const searchById = new Map(searchable.map((node) => [node.id, node]));
const paths = buildChapterPaths(searchable);
const queries = ["", "  ROOT ", "child > leaf", ">", "t > c", "root > child > leaf", "missing", "b > a"];
for (const node of searchable) {
  const label = chapterPath(node.id, searchById);
  assert.equal(paths.get(node.id), label);
  for (let start = 0; start < label.length; start++) {
    for (let end = start + 1; end <= label.length; end++) {
      queries.push(label.slice(start, end));
    }
  }
}
for (const query of queries) {
  const keyword = query.trim().toLocaleLowerCase();
  assert.deepEqual(
    [...paths.search(query)].sort(),
    searchable.filter((node) => chapterPath(node.id, searchById).toLocaleLowerCase().includes(keyword))
      .map((node) => node.id).sort(),
    query,
  );
}
assert.equal(paths.get("missing"), undefined);
let nameReads = 0;
const indexedNodes = nodes.map((node) => ({ ...node, get name() { nameReads++; return node.name; } }));
const deepPaths = buildChapterPaths(indexedNodes);
assert.equal(nameReads, nodes.length, "Index construction must not materialize full paths");
assert.equal(deepPaths.search("chapter 0").size, 5000);
assert.deepEqual([...deepPaths.search("Chapter 4998 > Chapter 4999")], ["4999"]);
assert.equal(nameReads, nodes.length, "Search must use the index, not rebuild labels");
assert.equal(deepPaths.get("4999").split(" > ").length, 5000);
assert.equal(nameReads, nodes.length * 2, "Only the requested full label is materialized");
deepPaths.get("4999");
assert.equal(nameReads, nodes.length * 2, "Requested labels are cached");

const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
const pickerFile = path.resolve(
  __dirname,
  "../src/components/ChapterPicker.tsx",
);
const picker = new Module(pickerFile, module);
picker.paths = module.paths;
picker.require = (name) => {
  if (name === "@/lib/chapter-tree") return fixture.exports;
  if (name === "next-intl") return { useTranslations: () => (key) => key };
  if (name === "@/components/ui/input")
    return { Input: (props) => React.createElement("input", props) };
  if (name === "@/components/ui/button")
    return {
      Button: ({ variant, size, ...props }) =>
        React.createElement("button", props),
    };
  return require(name);
};
picker._compile(
  ts.transpileModule(fs.readFileSync(pickerFile, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText,
  pickerFile,
);
const html = renderToStaticMarkup(
  React.createElement(picker.exports.ChapterPicker, {
    chapters: nodes,
    value: "4999",
    onChange: () => {},
  }),
);
assert.equal((html.match(/<option /g) || []).length, 51);
assert.ok(html.includes("Chapter 4999"));
assert.ok(html.includes("1/100"));
console.log(
  "PASS: 5000-level traversal, lazy labels, bounded indexed full-path search, ancestor question visibility, cycle termination and bounded picker options. Picker rendered with synthetic translations/UI primitives; no browser/backend used.",
);
