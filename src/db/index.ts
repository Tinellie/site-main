import "server-only";

import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import type { Pool } from "mysql2/promise";

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

  if (!databaseGlobal.blogMysqlPool) {
    const pool = createPool({
      uri: url,
      connectionLimit: 5,
      timezone: "Z",
    });
    // The driver's timezone only controls conversion, not MySQL's session clock.
    pool.on("connection", (connection) => {
      connection.query("SET time_zone = '+00:00'", (error) => {
        if (error) {
          console.error("Failed to set MySQL session timezone:", error);
          connection.destroy();
        }
      });
    });
    databaseGlobal.blogMysqlPool = pool.promise();
  }
  const pool = databaseGlobal.blogMysqlPool;

  return drizzle({ client: pool, schema, mode: "default" });
}