import "server-only";

import { AuthError } from "@/lib/auth/http";
import { MAX_CARD_IMAGE_BYTES } from "@/lib/cards/assets";

export async function readImageUploadForm(request: Request, label = "图片") {
  const limit = MAX_CARD_IMAGE_BYTES + 65536;
  if (Number(request.headers.get("content-length")) > limit) throw new AuthError(`${label}请求过大。`, 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(`请选择${label}。`, 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new AuthError(`${label}请求过大。`, 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch { throw new AuthError("上传表单无效。", 400); }
}
