import { boolean, index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const authUsers = mysqlTable("auth_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const authSessions = mysqlTable("auth_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: int("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [index("auth_sessions_expiry_idx").on(table.expiresAt)]);

export const authLoginLimits = mysqlTable("auth_login_limits", {
  key: varchar("limit_key", { length: 64 }).primaryKey(),
  attempts: int("attempts").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [index("auth_login_limits_expiry_idx").on(table.expiresAt)]);
