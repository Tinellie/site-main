import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

let catalogPromise: Promise<{ icons: Record<string, string> }> | undefined;

function getCatalog() {
  catalogPromise ??= fs.readFile(
    path.join(process.cwd(), ".generated", "mui-icons.json"), "utf8",
  ).then(text => JSON.parse(text));
  return catalogPromise;
}

export async function getMuiIconNames() {
  return Object.keys((await getCatalog()).icons);
}

export async function hasMuiIcon(name: string) {
  return (await getMuiIconNames()).includes(name);
}

export async function loadMuiIcon(name: string): Promise<string | null> {
  const { icons } = await getCatalog();
  return Object.hasOwn(icons, name) ? icons[name] : null;
}
