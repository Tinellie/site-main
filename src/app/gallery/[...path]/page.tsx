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
  let segments: string[];
  try { segments = path.map(segment => decodeURIComponent(segment)); }
  catch { notFound(); }
  const entries = await listAssets(segments);
  if (!entries) notFound();
  return <GalleryPage key={segments.join("/")} segments={segments} entries={entries} />;
}
