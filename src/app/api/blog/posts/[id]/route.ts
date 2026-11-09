import { NextResponse } from "next/server";

import { getPostById, savePost } from "@/lib/blog/post-store";

function parsePostId(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parsePostId(rawId);
  if (!id) {
    return NextResponse.json({ message: "无效文章 id。" }, { status: 400 });
  }

  const post = await getPostById(id);
  if (!post) {
    return NextResponse.json({ message: "文章不存在。" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parsePostId(rawId);
  if (!id) {
    return NextResponse.json({ message: "无效文章 id。" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "请求体不是有效 JSON。" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "请求体格式错误。" }, { status: 400 });
  }

  const body = payload as {
    title?: unknown;
    coverImage?: unknown;
    tags?: unknown;
    content?: unknown;
  };

  if (typeof body.title !== "string") {
    return NextResponse.json({ message: "标题必须为字符串。" }, { status: 400 });
  }
  if (typeof body.coverImage !== "string") {
    return NextResponse.json({ message: "封面图必须为字符串。" }, { status: 400 });
  }
  if (typeof body.content !== "string") {
    return NextResponse.json({ message: "正文必须为字符串。" }, { status: 400 });
  }
  if (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string")) {
    return NextResponse.json({ message: "标签必须为字符串数组。" }, { status: 400 });
  }

  try {
    const post = await savePost({
      id,
      title: body.title,
      coverImage: body.coverImage,
      tags: body.tags,
      content: body.content,
    });
    return NextResponse.json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
