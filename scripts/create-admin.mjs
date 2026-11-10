import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
import { config } from "dotenv";
import { createConnection } from "mysql2/promise";

import { hashPassword, isValidUsername, normalizeUsername } from "../src/lib/auth/credentials.ts";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const username = normalizeUsername(process.argv[2] ?? "");
  const reset = process.argv.includes("--reset");
  if (!isValidUsername(username)) {
    throw new Error("用法：npm run auth:admin -- <账号> [--reset]；账号为 3–64 位英文字母、数字、下划线或连字符。");
  }
  if (!process.env.DATABASE_URL) throw new Error("请先配置 DATABASE_URL 并执行数据库迁移。");
  if (!process.stdin.isTTY) throw new Error("请在交互式终端运行，以隐藏方式输入密码。");

  const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const input = createInterface({ input: process.stdin, output, terminal: true });
  let password;
  try {
    process.stdout.write("输入管理员密码（9–128 字符，不回显）：");
    password = await input.question("");
    process.stdout.write("\n再次输入密码：");
    const confirmation = await input.question("");
    process.stdout.write("\n");
    if (password !== confirmation) throw new Error("两次输入的密码不一致。");
  } finally {
    input.close();
  }
  const passwordHash = await hashPassword(password);
  const db = await createConnection({ uri: process.env.DATABASE_URL, timezone: "Z" });
  try {
    await db.beginTransaction();
    const [rows] = await db.execute("SELECT id FROM auth_users WHERE username = ? FOR UPDATE", [username]);
    if (rows.length) {
      if (!reset) throw new Error("账号已存在；如需重设密码并撤销全部会话，请添加 --reset。");
      await db.execute("UPDATE auth_users SET password_hash = ?, enabled = true WHERE id = ?", [passwordHash, rows[0].id]);
      await db.execute("DELETE FROM auth_sessions WHERE user_id = ?", [rows[0].id]);
    } else {
      if (reset) throw new Error("账号不存在，无法重设密码。");
      await db.execute("INSERT INTO auth_users (username, password_hash) VALUES (?, ?)", [username, passwordHash]);
    }
    await db.commit();
    console.log(reset ? "管理员密码已更新，旧会话已撤销。" : "管理员已创建。");
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
