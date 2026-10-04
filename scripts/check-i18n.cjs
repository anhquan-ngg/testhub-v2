const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("@formatjs/icu-messageformat-parser");

const root = path.join(__dirname, "..", "src", "messages");
const list = (directory, prefix = "") =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? list(path.join(directory, entry.name), path.join(prefix, entry.name))
      : entry.name.endsWith(".json")
        ? [path.join(prefix, entry.name)]
        : [],
  );

const viFiles = list(path.join(root, "vi")).sort();
const enFiles = list(path.join(root, "en")).sort();
const errors = [];
const placeholders = (elements) => {
  const names = new Set();
  const visit = (items) => {
    for (const item of items) {
      if (item.type >= 1 && item.type <= 6 && typeof item.value === "string") names.add(item.value);
      if (item.options) for (const option of Object.values(item.options)) visit(option.value);
      if (item.children) visit(item.children);
    }
  };
  visit(elements);
  return [...names].sort().join(",");
};
for (const file of [...new Set([...viFiles, ...enFiles])]) {
  if (!viFiles.includes(file) || !enFiles.includes(file)) {
    errors.push(`${file}: missing locale file`);
    continue;
  }
  const vi = JSON.parse(fs.readFileSync(path.join(root, "vi", file), "utf8"));
  const en = JSON.parse(fs.readFileSync(path.join(root, "en", file), "utf8"));
  const check = (left, right, key = "") => {
    for (const name of new Set([...Object.keys(left), ...Object.keys(right)])) {
      const current = `${key}${name}`;
      if (!(name in left) || !(name in right)) {
        errors.push(`${file}: unmatched key ${current}`);
      } else if (typeof left[name] === "string" && typeof right[name] === "string") {
        const parsed = {};
        for (const [locale, value] of [["vi", left[name]], ["en", right[name]]]) {
          try { parsed[locale] = parse(value); } catch (error) { errors.push(`${locale}/${file}:${current}: ${error.message}`); }
        }
        if (parsed.vi && parsed.en && placeholders(parsed.vi) !== placeholders(parsed.en))
          errors.push(`${file}:${current}: placeholder mismatch (${placeholders(parsed.vi)} vs ${placeholders(parsed.en)})`);
      } else if (left[name] && right[name] && typeof left[name] === "object" && typeof right[name] === "object") {
        check(left[name], right[name], `${current}.`);
      } else {
        errors.push(`${file}: mismatched type at ${current}`);
      }
    }
  };
  check(vi, en);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${viFiles.length} paired message files and ICU syntax.`);
}
