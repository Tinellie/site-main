import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function setOwnership(file) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
    throw new Error(`Storage must contain only regular files and directories: ${file}`);
  }
  if (stat.isDirectory()) {
    for (const name of await fs.readdir(file)) await setOwnership(path.join(file, name));
  }
  await fs.chown(file, 1000, 1000);
  await fs.chmod(file, stat.isDirectory() ? 0o750 : 0o640);
}

export async function prepareStorage(root, seed) {
  const blog = path.join(root, "content", "blog");
  const assets = path.join(root, "public", "assets");
  for (const directory of [blog, path.join(blog, "history"), assets]) {
    await fs.mkdir(directory, { recursive: true });
    const stat = await fs.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Invalid storage directory: ${directory}`);
  }
  for (const name of await fs.readdir(seed)) {
    try { await fs.copyFile(path.join(seed, name), path.join(assets, name), constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  await setOwnership(blog);
  await setOwnership(assets);
  console.log("Storage ready for the single app instance (uid/gid 1000); existing files were not overwritten.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  Promise.resolve().then(async () => {
    if (process.platform !== "linux" || process.getuid() !== 0 || process.cwd() !== "/app") {
      throw new Error("Run inside the tools container: docker compose --profile tools run --rm --no-deps --user 0:0 tools node scripts/prepare-storage.mjs");
    }
    await prepareStorage(process.cwd(), "/opt/site-seed");
  }).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
