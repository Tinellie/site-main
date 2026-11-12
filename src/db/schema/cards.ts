import { int, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

export const connectCategories = mysqlTable("connect_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  position: int("position").notNull(),
});

export const contentCards = mysqlTable("content_cards", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["connect", "project", "article"]).notNull(),
  position: int("position").notNull().default(0),
  title: varchar("title", { length: 200 }).notNull(),
  username: varchar("username", { length: 200 }).notNull().default(""),
  link: varchar("link", { length: 2048 }).notNull(),
  description: text("description").notNull(),
  image: varchar("image", { length: 1024 }).notNull().default(""),
  icon: varchar("icon", { length: 100 }).notNull().default("Language"),
  categoryId: int("category_id").references(() => connectCategories.id, { onDelete: "set null" }),
});
