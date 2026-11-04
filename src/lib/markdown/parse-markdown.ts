import "server-only";

import matter from "gray-matter";

export interface MarkdownMetadata {
  title?: string;
  description?: string;
  date?: string;
  tags: string[];
}

// Parse trusted author/import content only; this does not render or sanitize HTML.
export function parseMarkdown(source: string): {
  content: string;
  metadata: MarkdownMetadata;
} {
  const { content, data } = matter(source);

  return {
    content,
    metadata: {
      title: typeof data.title === "string" ? data.title : undefined,
      description:
        typeof data.description === "string" ? data.description : undefined,
      date:
        data.date instanceof Date
          ? data.date.toISOString()
          : typeof data.date === "string"
            ? data.date
            : undefined,
      tags: Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    },
  };
}