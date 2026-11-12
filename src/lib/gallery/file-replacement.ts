import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireEditor } from "@/lib/auth/session";
import { withContentWriteLock } from "@/lib/content-write-lock";
import { existingAssetPath, isMissingFile, validatedAssetPath } from "./file-paths";
import { validateReplacement } from "./file-content";

export async function replaceManagedAsset(file: File, value: unknown) {
  await requireEditor();
  const relative = validatedAssetPath(value);
  const bytes = await validateReplacement(file, relative);
  return withContentWriteLock(async () => {
    const destination = await existingAssetPath(relative);
    const stat = await fs.stat(destination);
    const temporary = path.join(path.dirname(destination), `.asset-replace-${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporary, bytes, { flag: "wx", mode: stat.mode & 0o777 });
      await fs.rename(temporary, destination);
    } finally {
      try { await fs.unlink(temporary); }
      catch (error) { if (!isMissingFile(error)) throw error; }
    }
    return relative;
  });
}
