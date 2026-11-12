import { CardInputError } from "@/features/cards/validation";
import { MAX_CARD_IMAGE_BYTES } from "@/lib/cards/assets";
import { readImageUploadForm } from "@/lib/images/upload-form";

export async function readCardSubmission(request: Request): Promise<{ payload: unknown; file?: File }> {
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const form = await readImageUploadForm(request);
    const file = form.get("file");
    const json = form.get("card");
    if (!(file instanceof File) || typeof json !== "string") throw new CardInputError("请提供图片和卡片数据。");
    if (file.size < 1 || file.size > MAX_CARD_IMAGE_BYTES) throw new CardInputError("请选择不超过 10MB 的图片。");
    try { return { payload: JSON.parse(json), file }; } catch { throw new CardInputError("卡片数据不是有效 JSON。"); }
  }
  try { return { payload: await request.json() }; } catch { throw new CardInputError("请求体不是有效 JSON。"); }
}
