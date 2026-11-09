import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GalleryPage } from "@/features/gallery/gallery-page";
import { listAssets } from "@/lib/gallery/asset-store";

export const metadata: Metadata = { title: "Gallery" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const entries = await listAssets(path);
  if (!entries) notFound();
  return <GalleryPage key={path.join("/")} segments={path} entries={entries} />;
}
