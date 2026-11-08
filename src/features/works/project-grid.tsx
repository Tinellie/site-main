import { ResponsiveCardGrid } from "@/components/cards/responsive-card-grid";
import { ProjectCard } from "@/features/works/project-card";
import type { WorkCardProps } from "@/features/works/types";

export function ProjectGrid({ items }: { items: readonly WorkCardProps[] }) {
  return (
    <ResponsiveCardGrid className="project-grid">
      {items.map((item) => (
        <ProjectCard key={item.title} {...item} />
      ))}
    </ResponsiveCardGrid>
  );
}