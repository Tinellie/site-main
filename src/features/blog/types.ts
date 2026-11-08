export interface BlogPostSummary {
  id: number;
  coverImage: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  tags: readonly string[];
}

export interface BlogPost extends BlogPostSummary {
  content: string;
}

export interface PostFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  tags: string[];
}