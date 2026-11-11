import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve("@mui/icons-material/package.json"));
const version = require("@mui/icons-material/package.json").version;
const format = 3;
const output = path.join(process.cwd(), ".generated", "mui-icons.json");
try {
  const cached = JSON.parse(await fs.readFile(output, "utf8"));
  if (cached.version === version && cached.format === format && Object.keys(cached.icons).length > 1000) {
    console.log("MUI icon catalog is up to date.");
    process.exit(0);
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const icons = {};
for (const file of (await fs.readdir(root)).filter(name => /^[A-Z][A-Za-z0-9]*\.js$/.test(name)).sort()) {
  const Icon = require(path.join(root, file)).default;
  const html = renderToStaticMarkup(createElement(Icon, { htmlColor: "#ffffff" }));
  const svg = html.slice(html.indexOf("<svg")).replace("<svg ", '<svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" ');
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) throw new Error(`Invalid icon: ${file}`);
  icons[file.slice(0, -3)] = svg;
}
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify({ version, format, icons }));
console.log(`Generated ${Object.keys(icons).length} MUI icons.`);
