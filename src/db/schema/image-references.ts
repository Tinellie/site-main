import { index, int, mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";

export const articleImageReferences = mysqlTable("article_image_references", {
  postId: int("post_id").notNull(),
  pathHash: varchar("path_hash", { length: 64 }).notNull(),
  assetPath: varchar("asset_path", { length: 1024 }).notNull(),
  postTitle: varchar("post_title", { length: 1024 }).notNull(),
}, table => [
  primaryKey({ columns: [table.postId, table.pathHash] }),
  index("article_image_references_path_idx").on(table.pathHash),
]);
