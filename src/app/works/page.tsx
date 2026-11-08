import type { Metadata } from "next";
import { WorksPage } from "@/features/works/works-page";

export const metadata: Metadata = { title: "Works" };

export default function Page() {
  return <WorksPage />;
}