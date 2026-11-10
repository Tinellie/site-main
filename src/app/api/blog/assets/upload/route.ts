import { NextResponse } from "next/server";

import { writeUploadedAsset } from "@/lib/blog/post-store";
import { authFailure } from "@/lib/auth/http";
import { authorizeWrite } from "@/lib/auth/session";

interface UploadResult {
  code: 0 | 1;
  msg: string;
  data?: {
    errFiles: string[];
    succMap: Record<string, string>;
  };
}

function uploadError(message: string): NextResponse<UploadResult> {
  return NextResponse.json(
    {
      code: 1,
      msg: message,
      data: { errFiles: [], succMap: {} },
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    await authorizeWrite(request);
  } catch (error) {
    return authFailure(error);
  }
  const formData = await request.formData();
  const files = [...formData.values()].filter((value): value is File => value instanceof File);

  if (files.length < 1) {
    return uploadError("未接收到上传文件。");
  }

  const succMap: Record<string, string> = {};
  const errFiles: string[] = [];

  await Promise.all(
    files.map(async (file) => {
      if (!file.type.startsWith("image/")) {
        errFiles.push(file.name || "unknown");
        return;
      }
      try {
        const url = await writeUploadedAsset(file);
        succMap[file.name || `image-${Date.now()}`] = url.slice("/assets/".length);
      } catch {
        errFiles.push(file.name || "unknown");
      }
    }),
  );

  const success = Object.keys(succMap).length > 0;

  return NextResponse.json<UploadResult>({
    code: success ? 0 : 1,
    msg: success ? "" : "图片上传失败。",
    data: {
      errFiles,
      succMap,
    },
  });
}
