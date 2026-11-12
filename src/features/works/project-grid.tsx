import { ResponsiveCardGrid } from "@/components/cards/responsive-card-grid";
import { CardReveal, CardRevealGroup } from "@/components/cards/card-reveal";
import { ProjectCard } from "@/features/works/project-card";
import type { WorkCardProps } from "@/features/works/types";

export function ProjectGrid({ items }: { items: readonly WorkCardProps[] }) {
  return (
    <CardRevealGroup>
    <ResponsiveCardGrid className="project-grid">
      {items.map((item) => (
        <CardReveal key={item.title}><ProjectCard {...item} /></CardReveal>
      ))}
    </ResponsiveCardGrid>
    </CardRevealGroup>
  );
}