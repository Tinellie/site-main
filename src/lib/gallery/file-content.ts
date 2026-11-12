import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import { assetKind } from "@/features/gallery/asset-kind";
import { AuthError } from "@/lib/auth/http";
import { validateSvg } from "@/lib/images/svg";

export const MAX_REPLACEMENT_BYTES = 10 * 1024 * 1024;

function isSvg(bytes: Uint8Array) {
  try { validateSvg(bytes); return true; }
  catch { return false; }
}

export async function readAssetContentType(file: string, name: string) {
  const kind = assetKind(name);
  // Text files remain inert even when they contain HTML or another document format.
  if (kind === "text") return "text/plain; charset=utf-8";
  const detected = await fileTypeFromFile(file);
  if (detected) return detected.mime;
  if (kind === "image" && isSvg(await fs.readFile(file))) return "image/svg+xml";
  return "application/octet-stream";
}

export async function validateReplacement(file: File, original: string) {
  if (!file.size || file.size > MAX_REPLACEMENT_BYTES) {
    throw new AuthError("请选择不超过 10MB 的文件。", 400);
  }
  const kind = assetKind(original);
  if (assetKind(file.name) !== kind) throw new AuthError("只能上传与原文件同一大类的文件。", 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (kind === "text") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\0")) throw new Error("Binary content.");
    } catch { throw new AuthError("文本文件必须是有效的 UTF-8 文本。", 400); }
  } else if (kind !== "file") {
    if (kind === "image" && path.extname(file.name).toLowerCase() === ".svg") {
      if (!isSvg(bytes)) throw new AuthError("SVG 格式无效，或包含不安全内容。", 400);
    } else {
      let mime: string | undefined;
      try { mime = (await fileTypeFromBuffer(bytes))?.mime; }
      catch { throw new AuthError("文件内容损坏或格式无效。", 400); }
      if (!mime?.startsWith(`${kind}/`)) throw new AuthError("文件内容与所选文件类别不符。", 400);
    }
  }
  return bytes;
}
