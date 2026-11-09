import { notFound } from "next/navigation";

import { PostEditorPage } from "@/features/blog/post-editor-page";
import { getPostById } from "@/lib/blog/post-store";

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export default async function Page({ params }: PageProps<"/blog/[id]/edit">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();
  const post = await getPostById(id);
  return <PostEditorPage id={id} initialPost={post} />;
}
