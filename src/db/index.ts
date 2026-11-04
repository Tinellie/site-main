import "server-only";

import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import * as schema from "@/db/schema";

const databaseGlobal = globalThis as typeof globalThis & {
  blogMysqlPool?: Pool;
};

// Lazy initialization keeps the blank site usable without a running database.
export function getDb() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("请先在 .env 中配置 DATABASE_URL，再使用数据库功能。");
  }

  const pool = (databaseGlobal.blogMysqlPool ??= createPool({
    uri: url,
    connectionLimit: 5,
    timezone: "Z",
  }));

  return drizzle({ client: pool, schema, mode: "default" });
}