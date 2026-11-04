import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  longtext,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: text("excerpt"),
    content: longtext("content").notNull(),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .onUpdateNow(),
    publishedAt: timestamp("published_at").default(sql`NULL`),
  },
  (table) => [index("posts_published_at_idx").on(table.published, table.publishedAt)],
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;