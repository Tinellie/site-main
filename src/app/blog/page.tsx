import type { Metadata } from "next";
import { BlogPage } from "@/features/blog/blog-page";

export const metadata: Metadata = { title: "Blog" };

export default function Page() {
  return <BlogPage />;
}