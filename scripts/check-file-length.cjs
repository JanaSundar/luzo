const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");

const MAX_LINES = 250;
const ROOT = process.cwd();
const TARGETS = [
  join(ROOT, "packages", "flow-builder", "src"),
  join(ROOT, "packages", "flow-types", "src"),
  join(ROOT, "apps", "luzo", "src", "features", "flow-editor"),
];

const violations = [];

for (const target of TARGETS) {
  walk(target);
}

if (violations.length > 0) {
  console.error("Source files over 250 lines:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("File length check passed.");

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!fullPath.match(/\.(ts|tsx)$/)) continue;
    const lines = readFileSync(fullPath, "utf8").split("\n").length;
    if (lines > MAX_LINES) {
      violations.push(`${relative(ROOT, fullPath)} (${lines} lines)`);
    }
  }
}
