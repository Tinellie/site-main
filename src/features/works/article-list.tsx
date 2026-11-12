"use client";

import { Stack } from "@mui/material";

import { CardReveal, CardRevealGroup } from "@/components/cards/card-reveal";
import { ArticleCard } from "@/features/works/article-card";
import type { WorkCardProps } from "@/features/works/types";

export function ArticleList({ items }: { items: readonly WorkCardProps[] }) {
  return (
    <CardRevealGroup>
    <Stack spacing={2} className="article-list">
      {items.map((item) => (
        <CardReveal key={item.title}><ArticleCard {...item} /></CardReveal>
      ))}
    </Stack>
    </CardRevealGroup>
  );
}