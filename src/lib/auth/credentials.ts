import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9_-]{3,64}$/.test(value);
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 9 || password.length > 128) {
    throw new Error("密码长度必须为 9–128 个字符。");
  }
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (password.length > 128) return false;
  const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match) throw new Error("数据库中的密码哈希格式无效。");
  const actual = await deriveKey(password, match[1]);
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
