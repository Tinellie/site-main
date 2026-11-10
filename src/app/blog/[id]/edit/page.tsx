import { notFound, redirect } from "next/navigation";

import { PostEditorPage } from "@/features/blog/post-editor-page";
import { getPostById } from "@/lib/blog/post-store";
import { getCurrentUser } from "@/lib/auth/session";

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export default async function Page({ params }: PageProps<"/blog/[id]/edit">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();
  if (!await getCurrentUser()) redirect(`/login?next=/blog/${id}/edit`);
  const post = await getPostById(id);
  return <PostEditorPage id={id} initialPost={post} />;
}
