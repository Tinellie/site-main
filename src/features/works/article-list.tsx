"use client";

import Stack from "@mui/material/Stack";

import { ArticleCard } from "@/features/works/article-card";
import type { WorkCardProps } from "@/features/works/types";

export function ArticleList({ items }: { items: readonly WorkCardProps[] }) {
  return (
    <Stack spacing={2} className="article-list">
      {items.map((item) => (
        <ArticleCard key={item.title} {...item} />
      ))}
    </Stack>
  );
}