import { PageTemplate } from "@/components/layout/page-template";
import { PageSection } from "@/components/layout/page-section";

import { Stack } from "@mui/material";

import { ProjectGrid } from "@/features/works/project-grid";
import { ArticleList } from "@/features/works/article-list";
import type { WorkCardProps } from "@/features/works/types";

export function WorksPage() {
  return (
    <PageTemplate title="Works">
      <Stack id="wo-sections" spacing={4}>
        <PageSection title="Projects">
          <ProjectGrid items={debugProjects} />
        </PageSection>
        <PageSection title="Articles">
          <ArticleList items={debugArticles} />
        </PageSection>
      </Stack>
    </PageTemplate>
  );
}

const debugProjects = [
  {
    image: "proj.png",
    title: "Personal Website",
    description:
      "A personal space for projects, writing and photography. This longer description tests multiline truncation and the native browser tooltip without changing the card height.",
    href: "/",
  },
  {
    image: "proj2.png",
    title: "Interface Playground",
    description: "Experiments with reusable components and responsive layouts.",
    href: "https://example.com",
  },
  {
    image: "@images/assets/model.jpg",
    title: "Visual Study",
    description: "A small visual experiment.",
    href: "/gallery",
  },
  {
    image: "model2.jpg",
    title: "Design Notes",
    description: "",
    href: "/blog",
  },
] as const satisfies readonly WorkCardProps[];

const debugArticles = [
  {
    image: "DSC01748.JPG",
    title: "Building a Personal Blog",
    description:
      "Notes on Next.js, MUI, and keeping a small website maintainable. This longer single-line description should end with an ellipsis on a narrow screen.",
    href: "/blog/first-post",
  },
  {
    image: "@images/assets/proj.png",
    title: "Reusable Interface Patterns",
    description: "A collection of practical component patterns.",
    href: "/blog/interface-notes",
  },
] as const satisfies readonly WorkCardProps[];