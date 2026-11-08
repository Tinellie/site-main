export interface BlogPost {
  id: string;
  image: string;
  title: string;
  description: string;
  publishedAt: string;
  tags: readonly string[];
}

export interface PostFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  tags: string[];
}