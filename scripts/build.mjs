// Builds the single-file app: dist/Study-Club-Depth-Flow.html
// Usage: node scripts/build.mjs
// No dependencies. Everything (styles, scripts, logos, Word library) is inlined
// so the output opens straight from a double-click, with no server or install.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const dataUri = (p) => "data:image/png;base64," + readFileSync(join(root, p)).toString("base64");

// Load order matters: later files use globals defined by earlier ones.
const APP_FILES = [
  "src/dom.js",
  "src/framework.js",
  "src/icons.js",
  "src/store.js",
  "src/checks.js",
  "src/graphics.js",
  "src/components.js",
  "src/views/dashboard.js",
  "src/views/project.js",
  "src/views/move1.js",
  "src/views/move2.js",
  "src/views/move3.js",
  "src/views/move4.js",
  "src/views/prove.js",
  "src/views/blueprint.js",
  "src/export-docx.js",
  "src/app.js",
];

const pkg = JSON.parse(read("package.json"));
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");

const appJs = [
  `const APP_VERSION = ${JSON.stringify(pkg.version)};`,
  `const LOGO_WHITE = ${JSON.stringify(dataUri("assets/logo_white.png"))};`,
  `const LOGO_COLOR = ${JSON.stringify(dataUri("assets/logo_full_color.png"))};`,
  ...APP_FILES.map((f) => `// ---- ${f} ----\n${read(f)}`),
].join("\n\n");

const html = read("src/index.html")
  .replace("/*{{STYLES}}*/", () => read("src/styles.css"))
  .replace("/*{{VENDOR}}*/", () => safe(read("vendor/docx.iife.js")))
  .replace("/*{{APP}}*/", () => safe(`(function () {\n"use strict";\n${appJs}\n})();`));

mkdirSync(join(root, "dist"), { recursive: true });
const out = join(root, "dist", "Study-Club-Depth-Flow.html");
writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB)`);
