import type { Metadata } from "next";

import { GalleryPage } from "@/features/gallery/gallery-page";
import { listAssets } from "@/lib/gallery/asset-store";

export const metadata: Metadata = { title: "Gallery" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const entries = await listAssets([]);
  return <GalleryPage segments={[]} entries={entries ?? []} />;
}
