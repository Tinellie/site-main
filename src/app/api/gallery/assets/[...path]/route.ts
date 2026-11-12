import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { AuthError, authFailure } from "@/lib/auth/http";
import { existingAssetPath, validatedAssetPath } from "@/lib/gallery/file-paths";
import { SVG_CONTENT_SECURITY_POLICY } from "@/lib/images/svg";

const types: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
};

function fileStream(file: string, start: number, end: number) {
  const source = createReadStream(file, { start, end });
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await iterator.next();
        if (chunk.done) controller.close();
        else controller.enqueue(new Uint8Array(chunk.value));
      } catch (error) {
        console.error("Gallery file stream failed:", error);
        controller.error(error);
        source.destroy();
      }
    },
    cancel() { source.destroy(); },
  });
}

export async function GET(request: Request, context: RouteContext<"/api/gallery/assets/[...path]">) {
  try {
    const relative = validatedAssetPath((await context.params).path.join("/"));
    const file = await existingAssetPath(relative);
    const { size } = await fs.stat(file);
    const contentType = types[path.extname(relative).toLowerCase()] ?? "text/plain; charset=utf-8";
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": contentType === "image/svg+xml"
        ? SVG_CONTENT_SECURITY_POLICY : "default-src 'none'; sandbox",
      "Accept-Ranges": "bytes",
    };
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
      if (!match[1] && Number(match[2]) === 0) {
        return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
      }
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
        return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
      }
      return new Response(fileStream(file, start, end), { status: 206, headers: {
        ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}`,
      } });
    }
    return new Response(size ? fileStream(file, 0, size - 1) : null, { headers: { ...headers, "Content-Length": String(size) } });
  } catch (error) {
    if (error instanceof AuthError) return authFailure(error);
    console.error("Gallery file read failed:", error);
    return NextResponse.json({ message: "文件读取失败。" }, { status: 500 });
  }
}
